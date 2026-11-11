#!/usr/bin/env node
/**
 * Prints how the careless player plays every level on fields of some
 * depths.
 *
 *   yarn report:levels [--seeds <n>] [--depth <n>]…
 *
 * For each level and depth it plays the careless player's games through
 * `playCasually()` in `src/testing/casual.ts`, as the specs in
 * `src/rules/levels/every_floor/` do, each level from seeds of its own
 * numbered as theirs are, so the report's first games are the spec's. It
 * prints how often the player cleared the level, marked `!` under its set's
 * floor, and the rounds and the wall's jumps a game took at the mean. It
 * fails, as the specs do, where a level falls under its set's floor on a
 * depth, but over more games, so the two can disagree either way. It loads
 * what it plays, `REPORT_API` in `src/testing/report_api.ts`, through Vite,
 * as the game's build loads the rules. The report is how the levels are
 * tuned to their floors: a level cleared less often on a depth is one to
 * look at again.
 *
 * Twelve depths' columns don't fit a terminal, so it plays the three the
 * specs hold the floors on, 11, 13 and 22 deep, unless `--depth` names
 * others, once for each.
 *
 * It exits with 1 where it fails, and with 2, saying why, for a command line
 * it can't read, before it plays anything.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SEEDS_OPTION, printReport, readSeeds } from "@fz/dev/report";
import {
  CONSOLE,
  importThroughVite,
  isStop,
  misread,
  readArgs,
  stopWith,
} from "@fz/dev/script";

/** @import { ReportColumns } from "@fz/dev/report" */
/** @import { Printer, ScriptIo, Stop } from "@fz/dev/script" */
/** @import { CasualPlay, ReportApi, ScriptLevel } from "../src/testing/script_api.ts" */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** How many games the report plays each level on each depth unless `--seeds` says otherwise. */
export const REPORT_SEEDS = 40;

/** The depths the report plays unless `--depth` names others: those the specs hold the floors on. */
export const REPORT_DEPTHS = [11, 13, 22];

/** Lists words as a sentence does, the last after "and". */
const AND_LIST = new Intl.ListFormat("en-GB", { type: "conjunction" });

const USAGE = `Usage: yarn report:levels [options]

Prints how the careless player plays every level on fields of some depths.

  --seeds <n>     Play each level n games on each depth, from seeds of its
                  own (default: ${String(REPORT_SEEDS)})
  --depth <n>     Play on a field n rows deep, given once for each depth
                  (default: ${AND_LIST.format(REPORT_DEPTHS.map(String))})
  -h, --help      Show this message`;

/**
 * What a command line asks the report for.
 *
 * @typedef {object} Request
 * @property {number} seeds How many games each level is played on each depth.
 * @property {ReadonlyArray<string> | undefined} depths The depths `--depth`
 *   names, as they were given, which the rules hold to their depths, or
 *   none for the report's own.
 */

/**
 * A game of the careless player's: the level and the depth it was played
 * on, the floor of the level's set, and how it went.
 *
 * @typedef {object} Play
 * @property {ScriptLevel} level
 * @property {number} depth
 * @property {number} floor How many times in 100 the level must be cleared.
 * @property {CasualPlay} game
 */

/**
 * The game as the report plays it: the levels, on the depths asked.
 *
 * @typedef {object} Game
 * @property {readonly ScriptLevel[]} levels Every level, in the order played.
 * @property {readonly string[]} depths The depths' headings, shallowest first.
 * @property {(level: ScriptLevel, depth: string, seed: number) => Play} play
 */

/**
 * The columns the report shows of a level's games on a depth: how often it
 * was cleared, marked under its set's floor, and the rounds and jumps a
 * game took at the mean.
 *
 * @type {ReportColumns<Play>}
 */
const COLUMNS = {
  headings: ["clear", "rounds", "jumps"],
  widths: [5, 6, 5],
  cellsOf: (plays) => {
    const [play] = plays;
    if (play === undefined) return [];
    const cleared = plays.filter(({ game }) => game.cleared).length;
    const mark = underFloor(plays) ? "!" : "";
    return [
      `${String(Math.round((cleared * 100) / plays.length))}${mark}`,
      String(Math.round(meanOf(plays, ({ game }) => game.rounds))),
      meanOf(plays, ({ game }) => game.jumps).toFixed(1),
    ];
  },
};

/**
 * Returns the mean of a count over some plays.
 *
 * @param {readonly Play[]} plays At least one.
 * @param {(play: Play) => number} count
 * @returns {number}
 */
function meanOf(plays, count) {
  return plays.reduce((sum, play) => sum + count(play), 0) / plays.length;
}

/**
 * Returns whether a level's games on a depth cleared it fewer times in 100
 * than its set's floor.
 *
 * @param {readonly Play[]} plays A level's games on one depth, at least one.
 * @returns {boolean}
 */
function underFloor(plays) {
  const cleared = plays.filter(({ game }) => game.cleared).length;
  return cleared * 100 < (plays[0]?.floor ?? 0) * plays.length;
}

/**
 * Returns what a command line asks the report for, or, for `--help` or one
 * the report can't read, what to print and the code to exit with.
 *
 * @param {readonly string[]} args
 * @returns {Request | Stop}
 */
export function readCommandLine(args) {
  const read = readArgs(args, {
    options: { ...SEEDS_OPTION, depth: { type: "string", multiple: true } },
    usage: USAGE,
  });
  if (isStop(read)) return read;
  const seeds = readSeeds(read.values.seeds, USAGE);
  if (isStop(seeds)) return seeds;
  return { seeds: seeds ?? REPORT_SEEDS, depths: read.values.depth };
}

/**
 * Returns what the report plays, `REPORT_API`, loaded through Vite.
 *
 * @returns {Promise<ReportApi>}
 */
export async function loadReportApi() {
  const module = await importThroughVite(
    join(ROOT, "src/testing/report_api.ts"),
    ROOT,
  );
  return /** @type {ReportApi} */ (module["REPORT_API"]);
}

/**
 * Returns the game as a request plays it, on the depths it asks for, or,
 * for a depth no field has, what to print and the code to exit with. It
 * throws for a level whose set has no floor.
 *
 * @param {ReportApi} api
 * @param {Request} request
 * @returns {Game | Stop}
 */
function gameOf(api, request) {
  const unfloored = api.levels.find(
    (level) => !Object.hasOwn(api.floors, level.set.id),
  );
  if (unfloored !== undefined) {
    throw new Error(`The set "${unfloored.set.id}" has no floor.`);
  }
  /** @type {Map<string, number>} */
  const depths = new Map();
  for (const asked of request.depths ?? REPORT_DEPTHS.map(String)) {
    const depth = Number(asked);
    if (!api.depths.includes(depth)) {
      return misread(
        `--depth takes a whole number from ${String(api.depths[0])} to ${String(api.depths.at(-1))}, not "${asked}".`,
        USAGE,
      );
    }
    depths.set(headingOf(depth), depth);
  }
  return {
    levels: api.levels,
    depths: [...depths.keys()].sort(
      (a, b) => (depths.get(a) ?? 0) - (depths.get(b) ?? 0),
    ),
    play: (level, heading, seed) => {
      const depth = depths.get(heading) ?? Number.NaN;
      return {
        level,
        depth,
        floor: api.floors[level.set.id] ?? 0,
        game: api.playCasually(level.number, depth, seed),
      };
    },
  };
}

/**
 * Returns a depth's heading over its columns.
 *
 * @param {number} depth
 * @returns {string}
 */
function headingOf(depth) {
  return `${String(depth)} deep`;
}

/**
 * Prints the report of the game, a line at a time, a level's line as it is
 * played, and how many games didn't clear their level and how many were of
 * a level under its set's floor on a depth, and returns the code to exit
 * with: 1 where any were, and 0 otherwise.
 *
 * @param {Game} game
 * @param {number} seeds
 * @param {(line: string) => void} print
 * @returns {number}
 */
function report(game, seeds, print) {
  return printReport(
    {
      entries: game.levels,
      speeds: game.depths,
      seeds,
      play: game.play,
      ...COLUMNS,
    },
    (plays) => [
      {
        count: plays.filter(({ game: played }) => !played.cleared).length,
        says: "didn't clear their level",
        fails: false,
      },
      {
        count: groupsOf(plays)
          .filter(underFloor)
          .reduce((sum, group) => sum + group.length, 0),
        says: "were of a level under its set's floor on their depth (!)",
        fails: true,
      },
    ],
    print,
  );
}

/**
 * Returns plays grouped by their level and depth.
 *
 * @param {readonly Play[]} plays
 * @returns {Play[][]}
 */
function groupsOf(plays) {
  /** @type {Map<string, Play[]>} */
  const groups = new Map();
  for (const play of plays) {
    const key = `${String(play.level.number)} ${String(play.depth)}`;
    groups.set(key, [...(groups.get(key) ?? []), play]);
  }
  return [...groups.values()];
}

/**
 * Prints the report a command line asks for, or its usage, and returns the
 * code to exit with: 0, 1 if a level falls under its set's floor on a
 * depth, or 2 for a command line it can't read, played nothing.
 *
 * @param {readonly string[]} args
 * @param {ScriptIo<ReportApi>} [io]
 * @returns {Promise<number>}
 */
export async function run(
  args,
  {
    load = loadReportApi,
    print = CONSOLE.print,
    printError = CONSOLE.printError,
  } = {},
) {
  /** @type {Printer} */
  const printer = { print, printError };
  const request = readCommandLine(args);
  if (isStop(request)) return stopWith(request, printer);
  const game = gameOf(await load(), request);
  if (isStop(game)) return stopWith(game, printer);
  return report(game, request.seeds, print);
}

if (import.meta.main) process.exitCode = await run(process.argv.slice(2));
