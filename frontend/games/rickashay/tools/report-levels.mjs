#!/usr/bin/env node
/**
 * Prints the design's table of the drafts over the game's levels, played
 * on every depth, and says which fall short of a check.
 *
 *   yarn report:levels [--set <id>] [--seeds <n>]
 *
 * For each level on each depth, on a pool of worker threads that load
 * `REPORT_API` (`src/testing/report_api.ts`) through Vite, it finds the
 * solver's line, plays the careless player's games and the blind player's
 * from the level's own seeds, its number times `@fz/dev/report`'s
 * `SEED_STRIDE` and on, the first of them the games the specs in
 * `src/rules/levels/every_floor/` and `every_check/` play, and measures its
 * sweet spot. It prints the table `docs/rickashay/design.md` gives in "The
 * drafts", laid out as Prettier lays out Markdown, with the narrowest sweet
 * spot and the most games cleared blind of each level beside it, the
 * columns of three figures for fields 11, 16 and 22 deep; then a line for
 * each level that falls short of a check on any depth: no line, under its
 * set's floor, over the blind ceiling, or under the least sweet spot. It
 * plays more games than the specs, so the two can disagree either way; the
 * report is how a level is judged and redrawn, in its set's file in
 * `src/rules/levels/`. It takes every core, so it waits its turn in the
 * queue `yarn verify:changed` keeps.
 *
 * It exits with 1 where a level falls short, and with 2, saying why, for a
 * command line it can't read, before it plays anything.
 */
import { availableParallelism } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isMainThread, parentPort, workerData } from "node:worker_threads";
import { solveOnThreads } from "@fz/dev/certify";
import { waitForTurn, waitedWords, waitingWords } from "@fz/dev/queue";
import {
  SEEDS_OPTION,
  SEED_STRIDE,
  middleAndMost,
  readSeeds,
} from "@fz/dev/report";
import {
  CONSOLE,
  importThroughVite,
  isStop,
  misread,
  readArgs,
  stopWith,
} from "@fz/dev/script";

/** @import { MessagePort } from "node:worker_threads" */
/** @import { Pool } from "@fz/dev/certify" */
/** @import { Printer, Stop } from "@fz/dev/script" */

/**
 * A level, so far as the report names it.
 *
 * @typedef {object} ReportLevel
 * @property {number} number Its place in the game, from 1.
 * @property {{ readonly id: string, readonly name: string }} set
 * @property {{ readonly id: string, readonly name: string, readonly around: string }} data
 */

/**
 * A level's wall in figures: its rows, the bricks it needs broken, and
 * their hits.
 *
 * @typedef {object} WallFigures
 * @property {number} rows
 * @property {number} bricks
 * @property {number} hits
 */

/**
 * How a level plays on a depth: the rounds of the solver's line, or null
 * for none; how many of the careless player's games cleared it, their
 * rounds all told, and each game's longest rally; how many of the blind
 * player's cleared it; and its sweet spot, in degrees.
 *
 * @typedef {object} DepthFigures
 * @property {number | null} rounds
 * @property {number} cleared
 * @property {number} clearedRounds
 * @property {readonly number[]} bests
 * @property {number} blind
 * @property {number} sweetSpot
 */

/**
 * What the report plays: the levels, the depths, the checks a level is held
 * to, a level's wall in figures by its number, and how it plays on a depth
 * over so many games of each player's.
 *
 * `tools/report-levels.spec.ts` holds the game's `REPORT_API` to it.
 *
 * @typedef {object} ReportApi
 * @property {readonly ReportLevel[]} levels Every level, in the order played.
 * @property {readonly number[]} depths Every depth a field has, shallowest first.
 * @property {Readonly<Record<string, number>>} floors The times in 100 the
 *   careless player must clear each level of a set, by the set's id.
 * @property {number} blindCeiling The most times in 100 aims drawn blind may
 *   clear a level.
 * @property {number} leastSweetSpot The narrowest sweet spot a level may
 *   leave, in degrees.
 * @property {(level: number) => WallFigures} wallOf
 * @property {(level: number, depth: number, firstSeed: number, games: number) => DepthFigures} figuresOf
 */

/**
 * A level to play on a depth, by its number, and how many games of each
 * player's from which seed on.
 *
 * @typedef {object} ReportJob
 * @property {number} level
 * @property {number} depth
 * @property {number} firstSeed
 * @property {number} games
 */

/**
 * A job as a thread of the pool hands it back, played.
 *
 * @typedef {ReportJob & { readonly figures: DepthFigures }} PlayedJob
 */

/**
 * What a command line asks the report for: a set's levels, or every one,
 * and how many games of each player's on each depth.
 *
 * @typedef {object} Request
 * @property {string | undefined} set
 * @property {number} games
 */

/**
 * Says what the report loads, how it plays its jobs, how it waits its turn
 * and where it prints, each its own unless a spec hands it another.
 *
 * @typedef {object} ReportIo
 * @property {() => Promise<ReportApi>} [load]
 * @property {(jobs: ReadonlyArray<ReportJob>, done: (played: PlayedJob) => void) => Promise<void>} [play]
 *   Plays jobs, handing each to `done` as it is played, in any order.
 * @property {(root: string, onWait: (ahead: number) => void) => Promise<() => void>} [queue]
 * @property {() => number} [now] Reads a clock in milliseconds.
 * @property {(line: string) => void} [print]
 * @property {(line: string) => void} [printError]
 */

/**
 * What a thread of the report's pool is started with: the mark that tells
 * it from any other thread.
 *
 * @typedef {object} PoolThread
 * @property {typeof POOL_MARK} pool
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The mark of a thread of the report's pool. */
const POOL_MARK = "rickashay-report";

/** How many games of each player's the report plays each level on each depth unless `--seeds` says otherwise: the design's forty. */
export const REPORT_SEEDS = 40;

/**
 * The depths whose figures the table shows side by side: the design's.
 *
 * @type {readonly number[]}
 */
export const SHOWN_DEPTHS = [11, 16, 22];

/**
 * The table's headings: the design's, then each level's narrowest sweet
 * spot and its most games cleared blind, which
 * `docs/rickashay/sketch/results.md` heads "Narrowest" and "Most".
 *
 * @type {readonly string[]}
 */
const HEADINGS = [
  "#",
  "Level",
  "Built around",
  "Rows",
  "Bricks",
  "Hits",
  "Solver's rounds",
  "Cleared, %",
  "Its least",
  "Its rounds",
  "A game's best rally",
  "Sweet spot, °",
  "Narrowest",
  "Blind, most",
];

const USAGE = `Usage: yarn report:levels [options]

Prints the design's table of the drafts over the levels, played on every
depth, and says which fall short of a check.

  --set <id>      Play only the levels of a set
  --seeds <n>     Play n games of each player's a level on each depth,
                  from seeds of its own (default: ${String(REPORT_SEEDS)})
  -h, --help      Show this message`;

/**
 * Returns what a command line asks the report for, or, for `--help` or one
 * the report can't read, what to print and the code to exit with.
 *
 * @param {readonly string[]} args
 * @returns {Request | Stop}
 */
export function readCommandLine(args) {
  const read = readArgs(args, {
    options: { ...SEEDS_OPTION, set: { type: "string" } },
    usage: USAGE,
  });
  if (isStop(read)) return read;
  const seeds = readSeeds(read.values.seeds, USAGE);
  if (isStop(seeds)) return seeds;
  return { set: read.values.set, games: seeds ?? REPORT_SEEDS };
}

/**
 * Returns what the report plays, `REPORT_API`, loaded through Vite, or
 * throws where the module exports none.
 *
 * @returns {Promise<ReportApi>}
 */
export async function loadReportApi() {
  const module = await importThroughVite(
    join(ROOT, "src/testing/report_api.ts"),
    ROOT,
  );
  const api = module["REPORT_API"];
  if (api === undefined) {
    throw new Error("src/testing/report_api.ts exports no REPORT_API.");
  }
  return /** @type {ReportApi} */ (api);
}

/**
 * Plays each job posted to a port, as a thread of the pool does, and posts
 * it back with its figures, or throws, naming the level and the depth, where
 * playing it throws.
 *
 * @param {MessagePort} port
 * @param {ReportApi} api
 */
export function serveJobs(port, api) {
  port.on("message", (/** @type {ReportJob} */ job) => {
    /** @type {DepthFigures} */
    let figures;
    try {
      figures = api.figuresOf(job.level, job.depth, job.firstSeed, job.games);
    } catch (error) {
      throw new Error(
        `Playing level ${String(job.level)} on a field ${String(job.depth)} deep failed.`,
        { cause: error },
      );
    }
    /** @type {PlayedJob} */
    const played = { ...job, figures };
    port.postMessage(played);
  });
}

/**
 * Returns the report's pool, which `@fz/dev/certify`'s `solveOnThreads()`
 * deals its jobs to: a thread for each core, each running this script.
 *
 * @returns {Pool}
 */
export function poolOf() {
  /** @type {PoolThread} */
  const thread = { pool: POOL_MARK };
  return {
    script: new URL(import.meta.url),
    threads: availableParallelism(),
    workerData: thread,
  };
}

/**
 * Returns the levels a request plays, in the order played, or, for a set
 * the game doesn't have, what to print and the code to exit with. It throws
 * for a level whose set has no floor.
 *
 * @param {ReportApi} api
 * @param {Request} request
 * @returns {ReadonlyArray<ReportLevel> | Stop}
 */
function levelsOf(api, request) {
  const unfloored = api.levels.find(
    (level) => !Object.hasOwn(api.floors, level.set.id),
  );
  if (unfloored !== undefined) {
    throw new Error(`The set "${unfloored.set.id}" has no floor.`);
  }
  const sets = [...new Set(api.levels.map((level) => level.set.id))];
  if (request.set !== undefined && !sets.includes(request.set)) {
    return misread(
      `--set takes ${sets.map((set) => `"${set}"`).join(" or ")}, not "${request.set}".`,
      USAGE,
    );
  }
  return api.levels.filter(
    (level) => request.set === undefined || level.set.id === request.set,
  );
}

/**
 * Returns a count in 100 of so many games.
 *
 * @param {number} count
 * @param {number} games
 * @returns {number}
 */
function inHundred(count, games) {
  return (count * 100) / games;
}

/**
 * Returns a count in 100 as a sentence says it: whole, or to a tenth, so
 * one just short of a check doesn't read as meeting it.
 *
 * @param {number} value
 * @returns {string}
 */
function hundredText(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * Returns the least or the most of a figure over the depths, and the first
 * depth it is at.
 *
 * @param {ReadonlyMap<number, DepthFigures>} byDepth
 * @param {(figures: DepthFigures) => number} figure
 * @param {-1 | 1} sign 1 for the least, -1 for the most.
 * @returns {{ value: number, depth: number }}
 */
function extremeOf(byDepth, figure, sign) {
  let found = { value: Number.NaN, depth: Number.NaN };
  for (const [depth, figures] of byDepth) {
    const value = figure(figures);
    if (Number.isNaN(found.value) || sign * value < sign * found.value) {
      found = { value, depth };
    }
  }
  return found;
}

/**
 * A level's row of the table, its cells in the order of the headings, and
 * the sentences that say how it falls short of a check, if it does.
 *
 * @typedef {object} LevelRow
 * @property {readonly string[]} cells
 * @property {readonly string[]} shortfalls
 */

/**
 * Returns a level's row of the table from its wall and how it plays on
 * every depth, over so many games of each player's, and how it falls short
 * of the checks.
 *
 * @param {ReportApi} api
 * @param {ReportLevel} level
 * @param {ReadonlyMap<number, DepthFigures>} byDepth
 * @param {number} games
 * @returns {LevelRow}
 */
function rowOf(api, level, byDepth, games) {
  const wall = api.wallOf(level.number);
  /**
   * Returns a cell of figures on the shown depths, a depth not played a dash.
   *
   * @param {(figures: DepthFigures) => string} cell
   * @returns {string}
   */
  const shown = (cell) =>
    SHOWN_DEPTHS.map((depth) => {
      const figures = byDepth.get(depth);
      return figures === undefined ? "-" : cell(figures);
    }).join(" / ");
  const unsolved = [...byDepth]
    .filter(([, figures]) => figures.rounds === null)
    .map(([depth]) => depth);
  const rounds = [...byDepth.values()].flatMap(({ rounds: line }) =>
    line === null ? [] : [line],
  );
  const least = extremeOf(byDepth, (f) => inHundred(f.cleared, games), 1);
  const narrowest = extremeOf(byDepth, (f) => f.sweetSpot, 1);
  const most = extremeOf(byDepth, (f) => inHundred(f.blind, games), -1);
  const floor = api.floors[level.set.id] ?? 0;
  const named = `Level ${String(level.number)}, ${level.data.name},`;
  const shortfalls = [
    unsolved.length === 0
      ? null
      : `${named} has no line on ${fieldsOf(unsolved)}: the solver can't clear it with a row to spare.`,
    least.value >= floor
      ? null
      : `${named} is cleared ${hundredText(least.value)} times in 100 on a field ${String(least.depth)} deep, under ${level.set.name}'s floor of ${String(floor)}.`,
    most.value <= api.blindCeiling
      ? null
      : `${named} is cleared blind ${hundredText(most.value)} times in 100 on a field ${String(most.depth)} deep, more than ${String(api.blindCeiling)}.`,
    narrowest.value >= api.leastSweetSpot
      ? null
      : `${named} leaves a sweet spot of ${narrowest.value.toFixed(2)}° on a field ${String(narrowest.depth)} deep, under ${String(api.leastSweetSpot)}°.`,
  ].filter((line) => line !== null);
  const cells = [
    String(level.number),
    level.data.name,
    level.data.around,
    String(wall.rows),
    String(wall.bricks),
    String(wall.hits),
    unsolved.length > 0
      ? `none on ${unsolved.join(", ")}`
      : `${String(Math.min(...rounds))}-${String(Math.max(...rounds))}`,
    shown((f) => String(Math.round(inHundred(f.cleared, games)))),
    least.value < 100
      ? `${String(Math.round(least.value))}, on ${String(least.depth)}`
      : "100",
    shown((f) =>
      f.cleared === 0 ? "-" : (f.clearedRounds / f.cleared).toFixed(0),
    ),
    shown((f) => {
      const [middle] = middleAndMost(f.bests);
      return middle === undefined ? "-" : String(middle);
    }),
    shown((f) => f.sweetSpot.toFixed(1)),
    `${narrowest.value.toFixed(2)}, on ${String(narrowest.depth)}`,
    most.value > 0
      ? `${String(Math.round(most.value))}, on ${String(most.depth)}`
      : "0",
  ];
  return { cells, shortfalls };
}

/**
 * Returns depths in words, as fields: "a field 12 deep", "fields 12 and 13
 * deep".
 *
 * @param {readonly number[]} depths At least one.
 * @returns {string}
 */
function fieldsOf(depths) {
  const listed = new Intl.ListFormat("en-GB", { type: "conjunction" }).format(
    depths.map(String),
  );
  return depths.length === 1
    ? `a field ${listed} deep`
    : `fields ${listed} deep`;
}

/**
 * Returns a table's lines as Prettier lays out Markdown: each column as
 * wide as its widest cell, three at the least, and a rule under the
 * headings.
 *
 * @param {readonly string[]} headings
 * @param {readonly (readonly string[])[]} rows
 * @returns {string[]}
 */
export function tableLines(headings, rows) {
  const widths = headings.map((heading, column) =>
    Math.max(
      3,
      heading.length,
      ...rows.map((row) => (row[column] ?? "").length),
    ),
  );
  /**
   * Returns a row of cells laid out to the columns' widths.
   *
   * @param {readonly string[]} cells
   * @returns {string}
   */
  const line = (cells) =>
    `| ${widths.map((width, column) => (cells[column] ?? "").padEnd(width)).join(" | ")} |`;
  return [
    line(headings),
    line(widths.map((width) => "-".repeat(width))),
    ...rows.map(line),
  ];
}

/**
 * Prints the report a command line asks for, or its usage, and returns the
 * code to exit with: 0, 1 if a level falls short of a check, or 2 for a
 * command line it can't read, played nothing.
 *
 * @param {readonly string[]} args
 * @param {ReportIo} [io]
 * @returns {Promise<number>}
 */
export async function run(
  args,
  {
    load = loadReportApi,
    play = (jobs, done) => solveOnThreads(jobs, done, poolOf()),
    queue = waitForTurn,
    now = Date.now,
    print = CONSOLE.print,
    printError = CONSOLE.printError,
  } = {},
) {
  /** @type {Printer} */
  const printer = { print, printError };
  const request = readCommandLine(args);
  if (isStop(request)) return stopWith(request, printer);
  const api = await load();
  const levels = levelsOf(api, request);
  if (isStop(levels)) return stopWith(levels, printer);
  const jobs = levels.flatMap((level) =>
    api.depths.map((depth) => ({
      level: level.number,
      depth,
      firstSeed: level.number * SEED_STRIDE,
      games: request.games,
    })),
  );
  const joined = now();
  /** @type {number[]} */
  const heard = [];
  const leave = await queue(ROOT, (ahead) => {
    heard.push(ahead);
    print(waitingWords(ahead));
  });
  /** @type {Map<string, DepthFigures>} */
  const played = new Map();
  try {
    if (heard.length > 0) print(waitedWords(now() - joined));
    await play(jobs, ({ level, depth, figures }) => {
      played.set(jobKey(level, depth), figures);
    });
  } finally {
    leave();
  }
  const rows = levels.map((level) => {
    /** @type {Map<number, DepthFigures>} */
    const byDepth = new Map();
    for (const depth of api.depths) {
      const figures = played.get(jobKey(level.number, depth));
      if (figures === undefined) {
        throw new Error(
          `Level ${String(level.number)} came back unplayed on a field ${String(depth)} deep.`,
        );
      }
      byDepth.set(depth, figures);
    }
    return rowOf(api, level, byDepth, request.games);
  });
  for (const line of tableLines(
    HEADINGS,
    rows.map(({ cells }) => cells),
  )) {
    print(line);
  }
  const shortfalls = rows.flatMap((row) => row.shortfalls);
  if (shortfalls.length === 0) return 0;
  print("");
  for (const line of shortfalls) print(line);
  return 1;
}

/**
 * Returns the key a level's figures on a depth are kept under.
 *
 * @param {number} level
 * @param {number} depth
 * @returns {string}
 */
function jobKey(level, depth) {
  return `${String(level)}@${String(depth)}`;
}

/**
 * Returns whether what a thread was started with marks it a thread of the
 * report's pool.
 *
 * @param {unknown} data
 * @returns {data is PoolThread}
 */
function isPoolThread(data) {
  return (
    typeof data === "object" &&
    data !== null &&
    "pool" in data &&
    data.pool === POOL_MARK
  );
}

// Node marks the script a thread runs as its main module too.
if (!isMainThread && isPoolThread(workerData) && parentPort !== null) {
  serveJobs(parentPort, await loadReportApi());
} else if (isMainThread && import.meta.main) {
  process.exitCode = await run(process.argv.slice(2));
}
