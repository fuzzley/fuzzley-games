#!/usr/bin/env node
// Plays Brick Breaker's levels as drafted and as redrawn, as
// `yarn report:levels --seeds` plays a level, and prints how each way went,
// for the record of a package's redraws.
//
//   node docs/brick-breaker-uplift/levels/play-variants.mjs [options] [id...]
//
// Each package's record is printed from its variants file, given by its path
// (`variants-k2.json`, beside the script, by default), as K4's is:
//
//   node docs/brick-breaker-uplift/levels/play-variants.mjs \
//     --variants docs/brick-breaker-uplift/levels/variants-k4.json \
//     > docs/brick-breaker-uplift/levels/report-k4-variants.txt
//
// The records saved before K4's lack its last column, the longest any play
// went between two touches of the paddle.
//
// Each level of the variants file, or only those named, is played in the
// place of the game's level with its id, through the report's own table
// (`@fz/dev/report`'s `printReport()`): from the seeds the report gives that
// level, as many as the file asks, at every preset speed, on the least field.
// Tints change no play, so a way of drawing a level gives only its bricks.
// It loads the game's rules and autopilot through Vite, as the report does,
// so it plays by the rules of the checkout it runs in.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  middleAndMost,
  printReport,
  timeOf,
} from "../../../frontend/lib/dev/src/report.ts";
import {
  CONSOLE,
  importThroughVite,
  isStop,
  misread,
  readArgs,
  stopWith,
} from "../../../frontend/lib/dev/src/script.ts";

/** @import { LevelEntry, LevelSetData } from "../../../frontend/games/brick-breaker/src/rules/levels/levels.ts" */
/** @import { AutopilotReport } from "../../../frontend/games/brick-breaker/src/testing/autopilot.ts" */
/** @import { Speed } from "../../../frontend/games/brick-breaker/src/rules/speed.ts" */
/** @import { ReportColumns, Tally } from "../../../frontend/lib/dev/src/report.ts" */
/** @import { Stop } from "../../../frontend/lib/dev/src/script.ts" */

const HERE = import.meta.dirname;
const GAME = join(HERE, "../../../frontend/games/brick-breaker");

const USAGE = `Usage: node docs/brick-breaker-uplift/levels/play-variants.mjs [options] [id...]

Plays each way of drawing a level in a variants file, or only the levels whose
ids are given, as yarn report:levels --seeds plays the level.

  --variants <file>  The variants file (default: variants-k2.json, beside it)
  -h, --help         Show this message`;

/** The first seeds, whose figures each speed shows apart, as `--seeds 12` plays them. */
const REPORTED = 12;

/**
 * The middle time at Relaxed, in seconds as printed, past which the report
 * marks a level `+`, as `tools/report-levels.mjs` does.
 */
const LONG_LEVEL_SECONDS = 120;

/**
 * The time between two touches of the paddle, in seconds as printed, past
 * which the report marks a play `^`, as one that hangs, as
 * `tools/report-levels.mjs` does.
 */
const HANGING_SECONDS = 60;

/**
 * A way of drawing a level.
 *
 * @typedef {object} Variant
 * @property {string} name
 * @property {string[]} bricks
 */

/**
 * A level and the ways it was drawn.
 *
 * @typedef {object} LevelVariants
 * @property {string} id The game's level they are played in place of.
 * @property {number} seeds How many seeds each way is played from.
 * @property {string} kept The name of the way the game keeps.
 * @property {Variant[]} variants
 */

/**
 * A play of a level, and the speed it was played at.
 *
 * @typedef {AutopilotReport & { speed: Speed }} Play
 */

/**
 * What the script takes from the game.
 *
 * @typedef {object} Game
 * @property {readonly LevelSetData[]} sets The sets of levels, in order.
 * @property {(sets: readonly LevelSetData[]) => LevelEntry[]} levelsOf
 * @property {readonly Speed[]} speeds The preset speeds, slowest first.
 * @property {number} stepSeconds The game time a step takes, in seconds.
 * @property {number} height The least field's height.
 * @property {number} endgameLimit The most steps an endgame may take there.
 * @property {(entry: LevelEntry, speed: Speed, options: { seed: number, height: number }) => AutopilotReport} playLevel
 */

/**
 * Returns what the script takes from the game, loaded through Vite.
 *
 * @returns {Promise<Game>}
 */
async function loadGame() {
  const [levels, speed, tuning, autopilot] = await Promise.all(
    [
      "src/rules/levels/levels.ts",
      "src/rules/speed.ts",
      "src/rules/tuning.ts",
      "src/testing/autopilot.ts",
    ].map((path) => importThroughVite(join(GAME, path), GAME)),
  );
  const height = /** @type {number} */ (tuning["FIELD_HEIGHT"]);
  const limitsOf = /** @type {(height: number) => { endgame: number }} */ (
    autopilot["limitsOf"]
  );
  return /** @type {Game} */ ({
    sets: levels["LEVEL_SETS"],
    levelsOf: levels["levelsOf"],
    speeds: speed["PRESET_SPEEDS"],
    stepSeconds: tuning["STEP_S"],
    height,
    endgameLimit: limitsOf(height).endgame,
    playLevel: autopilot["playLevel"],
  });
}

/**
 * Returns the game's entry for its level with an id, drawn as a variant
 * draws it, without tints, named for the variant, which changes no play.
 *
 * @param {Game} game
 * @param {string} id
 * @param {Variant} variant
 * @returns {LevelEntry}
 */
function entryOf(game, id, variant) {
  const sets = game.sets.map((set) => ({
    ...set,
    levels: set.levels.map((level) => {
      if (level.id !== id) return level;
      const { tints: _, ...data } = level;
      return { ...data, name: variant.name, bricks: variant.bricks };
    }),
  }));
  const entry = game.levelsOf(sets).find((each) => each.data.id === id);
  if (!entry) throw new Error(`The game has no level "${id}".`);
  return entry;
}

/**
 * Returns the columns the record shows of a way's plays at one speed: the
 * middle time of the first {@link REPORTED} plays, marked `+` as the report
 * marks it, and of all; the longest play; the longest endgame of the first
 * {@link REPORTED}, marked `!` past the field's limit, and of all; how many
 * endgames ran past the limit; the most lives lost; and the longest any
 * play went between two touches of the paddle, marked `^` as the report
 * marks it.
 *
 * @param {Game} game
 * @returns {ReportColumns<Play>}
 */
function columnsOf(game) {
  const time = (/** @type {number | undefined} */ steps) =>
    timeOf(steps, game.stepSeconds);
  return {
    headings: ["mid12", "mid", "most", "last12", "last", ">1m", "lost", "away"],
    widths: [6, 5, 5, 6, 5, 4, 4, 6],
    cellsOf: (plays) => {
      const reported = plays.slice(0, REPORTED);
      const [reportedMiddle] = middleAndMost(reported.map(stepsOf));
      const [middle, longest] = middleAndMost(plays.map(stepsOf));
      const reportedEndgame = longestEndgame(reported);
      const long = plays.filter(
        (play) => play.endgameSteps > game.endgameLimit,
      );
      return [
        time(reportedMiddle) + (isLong(reportedMiddle, plays, game) ? "+" : ""),
        time(middle),
        time(longest),
        time(reportedEndgame) +
          (reportedEndgame > game.endgameLimit ? "!" : ""),
        time(longestEndgame(plays)),
        String(long.length),
        String(Math.max(...plays.map((play) => play.livesLost))),
        awayOf(Math.max(...plays.map((play) => play.longestAway)), game),
      ];
    },
  };
}

/**
 * Returns the steps a play went between two touches of the paddle as the
 * game time they take, marked `^` past {@link HANGING_SECONDS}, as printed.
 *
 * @param {number} steps
 * @param {Game} game
 * @returns {string}
 */
function awayOf(steps, game) {
  const hangs = Math.round(steps * game.stepSeconds) > HANGING_SECONDS;
  return timeOf(steps, game.stepSeconds) + (hangs ? "^" : "");
}

/**
 * Returns the steps a play took to clear its level, or infinity if it
 * didn't clear it.
 *
 * @param {Play} play
 * @returns {number}
 */
function stepsOf(play) {
  return play.cleared ? play.steps : Number.POSITIVE_INFINITY;
}

/**
 * Returns the most steps any of some plays took over its last bricks.
 *
 * @param {readonly Play[]} plays
 * @returns {number}
 */
function longestEndgame(plays) {
  return Math.max(...plays.map((play) => play.endgameSteps));
}

/**
 * Returns whether a middle time is one the report marks `+`: at the slowest
 * speed, past {@link LONG_LEVEL_SECONDS} as printed.
 *
 * @param {number | undefined} steps
 * @param {readonly Play[]} plays
 * @param {Game} game
 * @returns {boolean}
 */
function isLong(steps, plays, game) {
  return (
    plays[0]?.speed === game.speeds[0] &&
    steps !== undefined &&
    Number.isFinite(steps) &&
    Math.round(steps * game.stepSeconds) > LONG_LEVEL_SECONDS
  );
}

/**
 * Prints a level's heading and the table of its ways, and returns the code
 * to exit with: 1 where a play didn't clear the level, and 0 otherwise.
 *
 * @param {Game} game
 * @param {LevelVariants} level
 * @param {(line: string) => void} print
 * @returns {number}
 */
function playVariants(game, level, print) {
  const entries = level.variants.map((variant) =>
    entryOf(game, level.id, variant),
  );
  const name = game
    .levelsOf(game.sets)
    .find((entry) => entry.data.id === level.id)?.data.name;
  print(
    `${String(entries[0]?.number)} ${String(name)}, ${String(level.seeds)} seeds. Kept: ${level.kept}.`,
  );
  const code = printReport(
    {
      entries,
      speeds: game.speeds,
      seeds: level.seeds,
      play: (entry, speed, seed) => ({
        ...game.playLevel(entry, speed, { seed, height: game.height }),
        speed,
      }),
      ...columnsOf(game),
    },
    (plays) => [uncleared(plays)],
    print,
  );
  print("");
  return code;
}

/**
 * Counts the plays that didn't clear their level, which fail the record.
 *
 * @param {readonly Play[]} plays
 * @returns {Tally}
 */
function uncleared(plays) {
  return {
    count: plays.filter((play) => !play.cleared).length,
    says: "didn't clear their level (-)",
    fails: true,
  };
}

/**
 * Returns the levels of a variants file a command line asks for, or, for
 * `--help` or one the script can't read, what to print and the code to exit
 * with.
 *
 * @param {readonly string[]} args
 * @returns {LevelVariants[] | Stop}
 */
function readRequest(args) {
  const read = readArgs(args, {
    options: { variants: { type: "string" } },
    allowPositionals: true,
    usage: USAGE,
  });
  if (isStop(read)) return read;
  const file = read.values.variants ?? join(HERE, "variants-k2.json");
  /** @type {{ levels: LevelVariants[] }} */
  const record = JSON.parse(readFileSync(file, "utf8"));
  const unknown = read.positionals.filter(
    (id) => !record.levels.some((level) => level.id === id),
  );
  if (unknown.length > 0) {
    return misread(`${file} has no level ${unknown.join(", ")}.`, USAGE);
  }
  for (const level of record.levels) {
    if (!level.variants.some((variant) => variant.name === level.kept)) {
      throw new Error(
        `${level.id} keeps "${level.kept}", which it doesn't draw.`,
      );
    }
  }
  return record.levels.filter(
    (level) =>
      read.positionals.length === 0 || read.positionals.includes(level.id),
  );
}

/** Says, first in the record, what each speed's columns hold. */
const LEGEND = `Levels as drafted and as redrawn, printed by play-variants.mjs. Each speed's
columns: the middle time of the first ${String(REPORTED)} seeds, as \`yarn report:levels
--seeds ${String(REPORTED)}\` prints it, and of all; the longest play; the longest endgame
(its last three bricks) of the first ${String(REPORTED)}, marked ! past a minute, and of all;
how many plays' endgames ran past a minute; the most lives lost; and the
longest any play went between two touches of the paddle, marked ^ past a
minute.
`;

/**
 * Prints the record a command line asks for, or its usage, and returns the
 * code to exit with: 0, 1 where a play didn't clear its level, or 2 for a
 * command line it can't read, played nothing.
 *
 * @param {readonly string[]} args
 * @returns {Promise<number>}
 */
async function run(args) {
  const levels = readRequest(args);
  if (isStop(levels)) return stopWith(levels, CONSOLE);
  const game = await loadGame();
  CONSOLE.print(LEGEND);
  let code = 0;
  for (const level of levels) {
    code = Math.max(code, playVariants(game, level, CONSOLE.print));
  }
  return code;
}

process.exitCode = await run(process.argv.slice(2));
