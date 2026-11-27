#!/usr/bin/env node
/**
 * Plays every level as the design's sketch's report plays its drafts,
 * prints the sketch's table of them, and says where a level's file keeps
 * other moves, stars or deals than its games set.
 *
 *   yarn report:levels [--set <id>]
 *
 * Each level is played on a worker thread of its own, as many at once as
 * the machine runs, each loading `REPORT_API` (`src/testing/report_api.ts`)
 * through Vite: on each of 40 deals, dealt moves to spare, 16 games of the
 * casual player's and 1 of the careful player's. Its games set its moves,
 * the fewest that let the casual player through as often as the level asks
 * and never fewer than the careful player needs 3 times in 4; its deals,
 * the 8 the casual player clears nearest as often as asked, each proven in
 * those moves by the proof's line; and its stars, the moves the careful
 * player's middle game leaves to spare for the third, and half of them for
 * the second. It prints the table `docs/fuzz-flux/sketch/results-table.md`
 * keeps, then a line for each level whose file in `src/rules/levels/`
 * keeps other moves, stars or deals, or that has fewer than 8 deals
 * proven. The files are the design's, so a level is redrawn in the
 * design's drafts, never by the report. It takes every core, so it waits
 * its turn in the queue `yarn verify:changed` keeps.
 *
 * It exits with 1 where a level's file differs from what its games set,
 * and with 2, saying why, for a command line it can't read, before it
 * plays anything.
 */
import { availableParallelism } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} from "node:worker_threads";
import { waitForTurn, waitedWords, waitingWords } from "@fz/dev/queue";
import { middleAndMost } from "@fz/dev/report";
import { CONSOLE, importThroughVite, isStop, stopWith } from "@fz/dev/script";
import { levelsOfSet, readSetOption } from "./set_option.mjs";

/** @import { Printer } from "@fz/dev/script" */

/**
 * A level, so far as the report reads it: its place in the game, from 1,
 * its set, and its name, moves, deals and stars as its file keeps them.
 *
 * @typedef {object} ReportLevel
 * @property {number} number
 * @property {{ readonly id: string }} set
 * @property {{ readonly name: string, readonly moves: number, readonly deals: ReadonlyArray<number>, readonly stars: ReadonlyArray<number> }} data
 */

/**
 * A deal the report plays: its level, by the level's number, the moves it
 * is dealt, and its seed.
 *
 * @typedef {object} ReportDeal
 * @property {number} level
 * @property {number} moves
 * @property {number} seed
 */

/**
 * How a player's game on a deal went: whether it cleared the level, and
 * the moves it used.
 *
 * @typedef {object} GameFigures
 * @property {boolean} cleared
 * @property {number} used
 */

/**
 * How the careful player's game on a deal went, and what its moves were
 * made of: how many waves each played, how many specials its bunches
 * made, and how many of its moves ended in a shuffle.
 *
 * @typedef {GameFigures & { readonly waves: ReadonlyArray<number>, readonly specials: number, readonly shuffles: number }} CarefulFigures
 */

/**
 * What the report plays: the levels, how many times in 100 the casual
 * player should clear one, by its number, and on a deal the casual
 * player's games, the careful player's and the proof's line, or null for
 * none.
 *
 * `tools/report-levels.spec.ts` holds the game's `REPORT_API` to it.
 *
 * @typedef {object} ReportApi
 * @property {readonly ReportLevel[]} levels Every level, in the order played.
 * @property {(level: number) => number} asked
 * @property {(deal: ReportDeal) => readonly GameFigures[]} casualGames
 * @property {(deal: ReportDeal) => CarefulFigures} careful
 * @property {(deal: ReportDeal) => ReadonlyArray<unknown> | null} proof
 */

/**
 * How a level played on the report's deals, and the moves, deals and stars
 * its games set.
 *
 * @typedef {object} LevelFigures
 * @property {number} number The level's place in the game, from 1.
 * @property {number} asked How many times in 100 the casual player should
 *   clear it.
 * @property {number} moves The moves its games set.
 * @property {number} casual The share of the casual player's games that
 *   cleared it in those moves.
 * @property {number} careful The share of the careful player's that did.
 * @property {number} casualMiddle The moves the casual player's middle game
 *   used, {@link UNCLEARED} for a game that didn't clear it.
 * @property {number} carefulMiddle The same of the careful player's.
 * @property {readonly number[]} rates The share of the casual player's games
 *   on each deal that cleared it in its moves, by the deal's seed from 1.
 * @property {readonly number[]} deals The deals its games set, the nearest
 *   to its ask first.
 * @property {readonly number[]} dealRates The share of the casual player's
 *   games on each of those deals that cleared it, in the deals' order.
 * @property {readonly number[]} proofs The moves of each deal's proof, in
 *   the deals' order.
 * @property {readonly [number, number, number]} stars The moves to spare
 *   each star asks for.
 * @property {number} wavesAMove The waves each of the careful player's
 *   moves played, on average.
 * @property {number} mostWaves The most waves one of its moves played.
 * @property {number} specialsAGame The specials its bunches made in a game,
 *   on average, the careful player playing a game a deal.
 * @property {number} shufflesAGame Its moves that ended in a shuffle in a
 *   game, on average.
 */

/**
 * Says what the report loads, how it plays the levels, how it waits its
 * turn and where it prints, each its own unless a spec hands it another.
 *
 * @typedef {object} ReportIo
 * @property {() => Promise<ReportApi>} [load]
 * @property {(levels: readonly number[]) => Promise<readonly LevelFigures[]>} [play]
 *   Plays levels, by their numbers, and returns their figures in their order.
 * @property {(root: string, onWait: (ahead: number) => void) => Promise<() => void>} [queue]
 * @property {() => number} [now] Reads a clock in milliseconds.
 * @property {(line: string) => void} [print]
 * @property {(line: string) => void} [printError]
 */

/**
 * What a thread of the report is started with: the mark that tells it from
 * any other thread, and the level it plays, by its number.
 *
 * @typedef {object} ReportThread
 * @property {typeof THREAD_MARK} pool
 * @property {number} level
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The mark of a thread of the report. */
const THREAD_MARK = "fuzz-flux-report";

/** How many deals the report plays each level on, by their seeds from 1. */
export const REPORT_DEALS = 40;

/** How many deals a level's games set it: the 8 every level has. */
export const LEVEL_DEALS = 8;

/** The moves each game the report plays is dealt: more than any level has, so a game ends only once cleared, or with its player out of moves. */
const OPEN_MOVES = 99;

/** What a game that didn't clear its level counts as among the moves the games used, so it sorts after every game that did. */
export const UNCLEARED = OPEN_MOVES + 1;

/**
 * Taken off the share a level asks before it is read off the casual games,
 * so a share that falls exactly on a game's place reads that game, the
 * last the share takes in, not the one after it.
 */
const HAIR = 1e-9;

/** The share of the careful player's games a level's moves must clear, with a move to spare. */
const CAREFUL_SHARE = 0.75;

/**
 * The table's headings and the rule under them, as the sketch's report
 * prints them.
 *
 * @type {readonly string[]}
 */
const TABLE_HEAD = [
  "| # | Level | Moves | Asked | Casual | Careful | Casual's middle | Careful's middle | Proof's middle | Proof's longest | Deals | Casual on its deals | Its deals range | All 40 deals range | Moves to spare for 2 and 3 stars | Waves a move | Most waves | Specials a game | Shuffles a game |",
  "| - | ----- | ----- | ----- | ------ | ------- | --------------- | ---------------- | -------------- | --------------- | ----- | ------------------- | --------------- | ------------------ | -------------------------------- | ------------ | ---------- | --------------- | --------------- |",
];

const USAGE = `Usage: yarn report:levels [options]

Plays every level as the design's sketch's report plays it, prints the
sketch's table of them, and says where a level's file keeps other moves,
stars or deals than its games set.

  --set <id>      Play only the levels of a set
  -h, --help      Show this message`;

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
 * Returns the value a share of the way up a list sorted from the least, or
 * {@link OPEN_MOVES} for an empty one, as the sketch's report reads it.
 *
 * @param {readonly number[]} sorted
 * @param {number} share From 0 to 1.
 * @returns {number}
 */
function shareOfTheWay(sorted, share) {
  return (
    sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))] ??
    OPEN_MOVES
  );
}

/**
 * Returns the moves a game used, or {@link UNCLEARED} for one that didn't
 * clear its level.
 *
 * @param {GameFigures} game
 * @returns {number}
 */
function movesUsed({ cleared, used }) {
  return cleared ? used : UNCLEARED;
}

/**
 * Returns numbers sorted from the least.
 *
 * @param {readonly number[]} numbers
 * @returns {number[]}
 */
function ascending(numbers) {
  return [...numbers].sort((a, b) => a - b);
}

/**
 * Returns the share of games, by the moves each used, that cleared their
 * level in so many moves.
 *
 * @param {readonly number[]} games
 * @param {number} moves
 * @returns {number}
 */
function clearedIn(games, moves) {
  const limit = Math.min(moves, OPEN_MOVES);
  return games.filter((used) => used <= limit).length / games.length;
}

/**
 * Returns how a level plays on the report's deals, and the moves, deals and
 * stars its games set, as the design's sketch's report sets them.
 *
 * @param {ReportApi} api
 * @param {ReportLevel} level
 * @returns {LevelFigures}
 */
export function figuresOf(api, { number }) {
  const asked = api.asked(number);
  const ask = asked / 100;
  /** @type {number[][]} */
  const byDeal = [];
  /** @type {number[]} */
  const carefulGames = [];
  /** @type {number[]} */
  const waves = [];
  let specials = 0;
  let shuffles = 0;
  for (let seed = 1; seed <= REPORT_DEALS; seed++) {
    const deal = { level: number, moves: OPEN_MOVES, seed };
    byDeal.push(api.casualGames(deal).map(movesUsed));
    const careful = api.careful(deal);
    carefulGames.push(movesUsed(careful));
    waves.push(...careful.waves);
    specials += careful.specials;
    shuffles += careful.shuffles;
  }
  const casual = ascending(byDeal.flat());
  const careful = ascending(carefulGames);
  const moves = Math.max(
    shareOfTheWay(casual, ask - HAIR),
    shareOfTheWay(careful, CAREFUL_SHARE) + 1,
  );
  const rates = byDeal.map((games) => clearedIn(games, moves));
  const nearest = rates
    .map((rate, at) => ({ seed: at + 1, rate }))
    .sort(
      (p, q) =>
        Math.abs(p.rate - ask) - Math.abs(q.rate - ask) || p.seed - q.seed,
    );
  /** @type {number[]} */
  const deals = [];
  /** @type {number[]} */
  const dealRates = [];
  /** @type {number[]} */
  const proofs = [];
  for (const { seed, rate } of nearest) {
    if (deals.length === LEVEL_DEALS) break;
    const line = api.proof({ level: number, moves, seed });
    if (line === null) continue;
    deals.push(seed);
    dealRates.push(rate);
    proofs.push(line.length);
  }
  const carefulMiddle = shareOfTheWay(careful, 0.5);
  const third = Math.max(1, moves - carefulMiddle);
  return {
    number,
    asked,
    moves,
    casual: clearedIn(casual, moves),
    careful: clearedIn(careful, moves),
    casualMiddle: shareOfTheWay(casual, 0.5),
    carefulMiddle,
    rates,
    deals,
    dealRates,
    proofs,
    stars: [0, Math.max(1, Math.floor(third / 2)), third],
    wavesAMove:
      waves.reduce((sum, wave) => sum + wave, 0) / Math.max(1, waves.length),
    mostWaves: Math.max(0, ...waves),
    specialsAGame: specials / REPORT_DEALS,
    shufflesAGame: shuffles / REPORT_DEALS,
  };
}

/**
 * Returns a share as the table writes it, in whole times in 100.
 *
 * @param {number} share
 * @returns {string}
 */
function percent(share) {
  return `${String(Math.round(share * 100))}%`;
}

/**
 * Returns the least and the most of some shares as the table writes them,
 * or a dash for none.
 *
 * @param {readonly number[]} shares
 * @returns {string}
 */
function rangeOf(shares) {
  return shares.length === 0
    ? "-"
    : `${percent(Math.min(...shares))} to ${percent(Math.max(...shares))}`;
}

/**
 * Returns a count as the table writes it, or a dash for none.
 *
 * @param {number | undefined} count
 * @returns {string}
 */
function countText(count) {
  return count === undefined ? "-" : String(count);
}

/**
 * Returns a level's row of the sketch's table.
 *
 * @param {ReportLevel} level
 * @param {LevelFigures} figures
 * @returns {string}
 */
export function rowOf({ data }, figures) {
  const { dealRates } = figures;
  const [proofMiddle, proofLongest] = middleAndMost(figures.proofs);
  const [, second, third] = figures.stars;
  const cells = [
    String(figures.number),
    data.name,
    String(figures.moves),
    `${String(figures.asked)}%`,
    percent(figures.casual),
    percent(figures.careful),
    String(figures.casualMiddle),
    String(figures.carefulMiddle),
    countText(proofMiddle),
    countText(proofLongest),
    String(figures.deals.length),
    dealRates.length === 0
      ? "-"
      : percent(
          dealRates.reduce((sum, rate) => sum + rate, 0) / dealRates.length,
        ),
    rangeOf(dealRates),
    rangeOf(figures.rates),
    `${String(second)}, ${String(third)}`,
    figures.wavesAMove.toFixed(2),
    String(figures.mostWaves),
    figures.specialsAGame.toFixed(1),
    figures.shufflesAGame.toFixed(2),
  ];
  return `| ${cells.join(" | ")} |`;
}

/**
 * Returns numbers in words, as a sentence lists them.
 *
 * @param {readonly number[]} numbers
 * @returns {string}
 */
function listed(numbers) {
  return new Intl.ListFormat("en-GB", { type: "conjunction" }).format(
    numbers.map(String),
  );
}

/**
 * Returns whether two lists hold the same numbers in the same order.
 *
 * @param {readonly number[]} first
 * @param {readonly number[]} second
 * @returns {boolean}
 */
function sameNumbers(first, second) {
  return (
    first.length === second.length &&
    first.every((number, at) => number === second[at])
  );
}

/**
 * Returns the sentences that say where a level's file keeps other moves,
 * stars or deals than its games set, or that it has fewer deals proven
 * than it needs: none for a level whose file keeps what they set.
 *
 * @param {ReportLevel} level
 * @param {LevelFigures} figures
 * @returns {string[]}
 */
export function differencesOf({ number, data }, figures) {
  const named = `Level ${String(number)}, ${data.name}:`;
  const kept = ", where its file keeps";
  const { moves, stars, deals } = figures;
  return [
    moves === data.moves
      ? null
      : `${named} its games set ${String(moves)} moves${kept} ${String(data.moves)}.`,
    sameNumbers(stars, data.stars)
      ? null
      : `${named} its games set its stars at ${listed(stars)} moves to spare${kept} ${listed(data.stars)}.`,
    deals.length < LEVEL_DEALS
      ? `${named} ${String(deals.length)} of its ${String(REPORT_DEALS)} deals are proven in ${String(moves)} moves, short of ${String(LEVEL_DEALS)}.`
      : sameNumbers(deals, data.deals)
        ? null
        : `${named} its games set the deals ${listed(deals)}${kept} ${listed(data.deals)}.`,
  ].filter((line) => line !== null);
}

/**
 * Plays each level on a worker thread of its own, as many at once as the
 * machine runs, each running this script, which loads the game's
 * `REPORT_API` through Vite; and returns their figures in the order of the
 * levels.
 *
 * Once a thread fails, it stops every thread still playing, starts no
 * other, and rejects with what failed.
 *
 * A thread loads the API afresh for each level, as the sketch's report
 * starts a worker for each, since that takes a few tenths of a second
 * beside the seconds a level takes.
 *
 * @param {readonly number[]} levels The levels' numbers.
 * @param {number} [threads] How many to play at once.
 * @returns {Promise<LevelFigures[]>}
 */
export async function playOnThreads(levels, threads = availableParallelism()) {
  const waiting = [...levels.entries()];
  /** @type {Set<Worker>} */
  const playing = new Set();
  /** @type {LevelFigures[]} */
  const played = [];
  const playInTurn = async () => {
    for (
      let next = waiting.shift();
      next !== undefined;
      next = waiting.shift()
    ) {
      const [at, level] = next;
      played[at] = await playOnThread(level, playing);
    }
  };
  try {
    await Promise.all(
      Array.from({ length: Math.min(threads, levels.length) }, playInTurn),
    );
  } catch (error) {
    waiting.length = 0;
    await Promise.all([...playing].map((worker) => worker.terminate()));
    throw error;
  }
  return played;
}

/**
 * Plays a level, by its number, on a worker thread of its own, kept among
 * the threads playing until it ends, and returns its figures, or rejects
 * with what failed.
 *
 * @param {number} level
 * @param {Set<Worker>} playing
 * @returns {Promise<LevelFigures>}
 */
function playOnThread(level, playing) {
  /** @type {ReportThread} */
  const thread = { pool: THREAD_MARK, level };
  const worker = new Worker(new URL(import.meta.url), { workerData: thread });
  playing.add(worker);
  return new Promise((resolve, reject) => {
    worker.once("message", resolve);
    worker.once("error", reject);
    worker.once("exit", (code) => {
      playing.delete(worker);
      reject(
        new Error(
          `The thread playing level ${String(level)} stopped with ${String(code)} before it played it.`,
        ),
      );
    });
  });
}

/**
 * Returns a level's figures, by its number, as a thread of the report plays
 * it, or throws, naming the level, where playing it throws.
 *
 * @param {ReportApi} api
 * @param {number} number
 * @returns {LevelFigures}
 */
export function playedLevel(api, number) {
  try {
    const level = api.levels[number - 1];
    if (level === undefined) {
      throw new RangeError(
        `The levels run from 1 to ${String(api.levels.length)}.`,
      );
    }
    return figuresOf(api, level);
  } catch (error) {
    throw new Error(`Playing level ${String(number)} failed.`, {
      cause: error,
    });
  }
}

/**
 * Prints the report a command line asks for, or its usage, and returns the
 * code to exit with: 0, 1 if a level's file differs from what its games
 * set, or 2 for a command line it can't read, played nothing.
 *
 * @param {readonly string[]} args
 * @param {ReportIo} [io]
 * @returns {Promise<number>}
 */
export async function run(
  args,
  {
    load = loadReportApi,
    play = playOnThreads,
    queue = waitForTurn,
    now = Date.now,
    print = CONSOLE.print,
    printError = CONSOLE.printError,
  } = {},
) {
  /** @type {Printer} */
  const printer = { print, printError };
  const request = readSetOption(args, USAGE);
  if (isStop(request)) return stopWith(request, printer);
  const api = await load();
  const levels = levelsOfSet(api.levels, request, USAGE);
  if (isStop(levels)) return stopWith(levels, printer);
  const joined = now();
  /** @type {number[]} */
  const heard = [];
  const leave = await queue(ROOT, (ahead) => {
    heard.push(ahead);
    print(waitingWords(ahead));
  });
  /** @type {readonly LevelFigures[]} */
  let played;
  try {
    if (heard.length > 0) print(waitedWords(now() - joined));
    played = await play(levels.map((level) => level.number));
  } finally {
    leave();
  }
  /** @type {string[]} */
  const differences = [];
  for (const line of TABLE_HEAD) print(line);
  for (const [at, level] of levels.entries()) {
    const figures = played[at];
    if (figures?.number !== level.number) {
      throw new Error(`Level ${String(level.number)} came back unplayed.`);
    }
    print(rowOf(level, figures));
    differences.push(...differencesOf(level, figures));
  }
  if (differences.length === 0) return 0;
  print("");
  for (const line of differences) print(line);
  return 1;
}

/**
 * Returns whether what a thread was started with marks it a thread of the
 * report's.
 *
 * @param {unknown} data
 * @returns {data is ReportThread}
 */
function isReportThread(data) {
  return (
    typeof data === "object" &&
    data !== null &&
    "pool" in data &&
    data.pool === THREAD_MARK &&
    "level" in data &&
    typeof data.level === "number"
  );
}

// Node marks the script a thread runs as its main module too.
if (!isMainThread && isReportThread(workerData) && parentPort !== null) {
  parentPort.postMessage(playedLevel(await loadReportApi(), workerData.level));
} else if (isMainThread && import.meta.main) {
  process.exitCode = await run(process.argv.slice(2));
}
