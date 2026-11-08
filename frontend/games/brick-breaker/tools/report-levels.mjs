#!/usr/bin/env node
/**
 * Prints how the autopilot plays every level at every preset speed.
 *
 *   yarn report:levels [--seeds <n>] [--height <n>]
 *
 * For each level and speed it prints the game time the autopilot took to
 * clear the level, the time of that it spent on the last three bricks the
 * level needed, how many times its paddle met a ball, and the lives it
 * lost. It plays each through the autopilot's `playLevel()`, as the specs
 * in `src/rules/levels/every_level/` do, so the report and the specs play
 * the same games, and it fails as the specs do: when a play doesn't clear
 * its level (`-`), or takes longer than the specs allow over its last
 * bricks (`!`). It loads the rules and the autopilot through Vite, as the
 * game's build does. The report is how the difficulty ramp is tuned: a level
 * that takes long, or costs lives at Relaxed, is one to look at again.
 *
 * With `--seeds`, it plays each level that many times at each speed, from
 * seeds of its own, and prints the middle time, the longest, the longest
 * endgame and the most lives lost, since the capsules one seed lets fall can
 * make a level look far easier or harder than it is. It still marks and
 * counts the endgames longer than the spec allows, but fails only on a play
 * that doesn't clear its level: across many seeds, a few plays are unlucky
 * however a level is drawn.
 *
 * With `--height`, it plays every level on a field that many units tall,
 * as a tall screen lays it out, from the least height to the tallest, to
 * the autopilot's limits for that height (`limitsOf()`). It marks the
 * endgames longer than those allow, but fails only on a play that doesn't
 * clear its level, as the spec holds the tallest field.
 *
 * It exits with 1 where it fails, and with 2, saying why, for a command line
 * it can't read, before it plays anything.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SEEDS_OPTION,
  middleAndMost,
  printReport,
  readSeeds,
  timeOf,
} from "@fz/dev/report";
import {
  CONSOLE,
  importThroughVite,
  isStop,
  misread,
  readArgs,
  stopWith,
} from "@fz/dev/script";

/** @import { ReportColumns } from "@fz/dev/report" */
/** @import { ScriptIo, Stop } from "@fz/dev/script" */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const USAGE = `Usage: yarn report:levels [options]

Prints how the autopilot plays every level at every preset speed.

  --seeds <n>     Play each level from n seeds of its own (default: from its
                  number alone)
  --height <n>    Play on a field n units tall (default: the shortest)
  -h, --help      Show this message`;

/**
 * What a command line asks the report for.
 *
 * @typedef {object} Request
 * @property {number | undefined} seeds How many seeds each level is played
 *   from, or none for its number alone.
 * @property {string | undefined} height How tall a field `--height` asks
 *   for, as it was given, which the rules hold to their heights.
 */

/**
 * A level as the rules list it.
 *
 * @typedef {object} LevelEntry
 * @property {number} number Its place in the game, from 1.
 * @property {{ id: string, name: string }} data
 */

/**
 * How the autopilot's play of a level went.
 *
 * @typedef {object} AutopilotReport
 * @property {boolean} cleared
 * @property {number} steps
 * @property {number} endgameSteps
 * @property {number} bounces
 * @property {number} livesLost
 */

/**
 * The longest the autopilot may take over a level, in steps.
 *
 * @typedef {object} AutopilotLimits
 * @property {number} level
 * @property {number} endgame
 */

/**
 * What the script takes from the rules and the autopilot.
 *
 * @typedef {object} Rules
 * @property {readonly LevelEntry[]} levels Every level, in the order played.
 * @property {readonly string[]} speeds The preset speeds, slowest first: all but Custom.
 * @property {number} stepSeconds The game time a step takes, in seconds.
 * @property {number} leastHeight The field's height, unless a tall screen makes it taller.
 * @property {number} tallest The tallest a field grows.
 * @property {(height: number) => AutopilotLimits} limitsOf
 * @property {(entry: LevelEntry, speed: string, options: { seed: number, height: number }) => AutopilotReport} playLevel
 */

/**
 * The game as the report plays it: the rules, on a field of the height
 * asked.
 *
 * @typedef {object} Game
 * @property {readonly LevelEntry[]} levels Every level, in the order played.
 * @property {readonly string[]} speeds The preset speeds, slowest first: all but Custom.
 * @property {number} stepSeconds The game time a step takes, in seconds.
 * @property {number} height How tall the field is played.
 * @property {boolean} tallerField Whether the field is taller than the least, which the spec holds to no endgame's limit.
 * @property {number} endgameLimit The most steps a play's endgame may take on that field.
 * @property {(entry: LevelEntry, speed: string, seed: number) => AutopilotReport} playLevel
 */

/**
 * Returns the columns the report shows of a level's plays at one speed,
 * from its number alone or from many seeds.
 *
 * @param {number | undefined} seeds
 * @param {Game} game
 * @returns {ReportColumns<AutopilotReport>}
 */
function columnsOf(seeds, game) {
  if (seeds === undefined) {
    return {
      headings: ["time", "last", "bounces", "lost"],
      widths: [5, 6, 8, 5],
      cellsOf: ([play]) =>
        play
          ? [
              timeOf(stepsOf(play), game.stepSeconds),
              endgameOf(play.endgameSteps, game),
              String(play.bounces),
              String(play.livesLost),
            ]
          : [],
    };
  }
  return {
    headings: ["middle", "most", "last", "lost"],
    widths: [6, 5, 6, 5],
    cellsOf: (plays) => {
      const [middle, most] = middleAndMost(plays.map(stepsOf));
      return [
        timeOf(middle, game.stepSeconds),
        timeOf(most, game.stepSeconds),
        endgameOf(Math.max(...plays.map((play) => play.endgameSteps)), game),
        String(Math.max(...plays.map((play) => play.livesLost))),
      ];
    },
  };
}

/**
 * Returns the steps a play took to clear its level, or infinity if it
 * didn't clear it.
 *
 * @param {AutopilotReport} play
 * @returns {number}
 */
function stepsOf(play) {
  return play.cleared ? play.steps : Number.POSITIVE_INFINITY;
}

/**
 * Returns what a command line asks the report for, or, for `--help` or one
 * the report can't read, what to print and the code to exit with.
 *
 * @param {readonly string[]} args
 * @returns {Request | Stop}
 */
function readCommandLine(args) {
  const read = readArgs(args, {
    options: { ...SEEDS_OPTION, height: { type: "string" } },
    usage: USAGE,
  });
  if (isStop(read)) return read;
  const seeds = readSeeds(read.values.seeds, USAGE);
  if (isStop(seeds)) return seeds;
  return { seeds, height: read.values.height };
}

/**
 * Returns what the report takes from the rules and the autopilot, loaded
 * through Vite.
 *
 * @returns {Promise<Rules>}
 */
async function loadRules() {
  const [levels, speed, tuning, autopilot] = await Promise.all([
    importThroughVite(join(ROOT, "src/rules/levels/levels.ts"), ROOT),
    importThroughVite(join(ROOT, "src/rules/speed.ts"), ROOT),
    importThroughVite(join(ROOT, "src/rules/tuning.ts"), ROOT),
    importThroughVite(join(ROOT, "src/testing/autopilot.ts"), ROOT),
  ]);
  return /** @type {Rules} */ ({
    levels: levels["LEVELS"],
    speeds: speed["PRESET_SPEEDS"],
    stepSeconds: tuning["STEP_S"],
    leastHeight: tuning["FIELD_HEIGHT"],
    tallest: tuning["TALLEST_FIELD"],
    limitsOf: autopilot["limitsOf"],
    playLevel: autopilot["playLevel"],
  });
}

/**
 * Returns the game as the report plays it, on a field as tall as `--height`
 * asks, the least by default, or, for a height the rules don't allow, what
 * to print and the code to exit with.
 *
 * @param {Rules} rules
 * @param {string | undefined} heightAsked
 * @returns {Game | Stop}
 */
function gameOf(rules, heightAsked) {
  const height = heightOf(heightAsked, rules);
  if (isStop(height)) return height;
  return {
    levels: rules.levels,
    speeds: rules.speeds,
    stepSeconds: rules.stepSeconds,
    height,
    tallerField: height > rules.leastHeight,
    endgameLimit: rules.limitsOf(height).endgame,
    playLevel: (entry, speed, seed) =>
      rules.playLevel(entry, speed, { seed, height }),
  };
}

/**
 * Returns the field's height `--height` asks for, the least by default, or,
 * for one the rules don't allow, what to print and the code to exit with.
 *
 * @param {string | undefined} height
 * @param {Rules} rules
 * @returns {number | Stop}
 */
function heightOf(height, rules) {
  if (height === undefined) return rules.leastHeight;
  const units = Number(height);
  if (
    !Number.isInteger(units) ||
    units < rules.leastHeight ||
    units > rules.tallest
  ) {
    return misread(
      `--height takes a whole number from ${String(rules.leastHeight)} to ${String(rules.tallest)}, not "${height}".`,
      USAGE,
    );
  }
  return units;
}

/**
 * Returns an endgame's steps as the game time it takes, marked `!` when it
 * is longer than the spec allows.
 *
 * @param {number} steps
 * @param {Game} game
 * @returns {string}
 */
function endgameOf(steps, game) {
  return (
    timeOf(steps, game.stepSeconds) + (steps > game.endgameLimit ? "!" : "")
  );
}

/**
 * Prints the report of the game, a line at a time, a level's line as it is
 * played, and how many plays didn't clear their level or took longer over
 * their last bricks than the field allows, and returns the code to exit
 * with: 1 where a play didn't clear its level, or, played from each level's
 * number on the least field, took too long over its last bricks, and 0
 * otherwise.
 *
 * @param {Game} game
 * @param {number | undefined} seeds
 * @param {(line: string) => void} print
 * @returns {number}
 */
function report(game, seeds, print) {
  const limit = game.tallerField
    ? `a field ${String(game.height)} tall allows`
    : "the spec allows";
  return printReport(
    {
      entries: game.levels,
      speeds: game.speeds,
      seeds,
      play: game.playLevel,
      ...columnsOf(seeds, game),
    },
    (plays) => [
      {
        count: plays.filter((play) => !play.cleared).length,
        says: "didn't clear their level (-)",
        fails: true,
      },
      {
        count: plays.filter((play) => play.endgameSteps > game.endgameLimit)
          .length,
        says: `took longer than ${limit} over their level's last bricks (!)`,
        fails: seeds === undefined && !game.tallerField,
      },
    ],
    print,
  );
}

/**
 * Prints the report a command line asks for, or its usage, and returns the
 * code to exit with: 0, 1 if it fails, or 2 for a command line it can't
 * read, played nothing.
 *
 * @param {readonly string[]} args
 * @param {ScriptIo<Rules>} [io]
 * @returns {Promise<number>}
 */
export async function run(
  args,
  {
    load = loadRules,
    print = CONSOLE.print,
    printError = CONSOLE.printError,
  } = {},
) {
  const printer = { print, printError };
  const request = readCommandLine(args);
  if (isStop(request)) return stopWith(request, printer);
  const game = gameOf(await load(), request.height);
  if (isStop(game)) return stopWith(game, printer);
  return report(game, request.seeds, print);
}

if (import.meta.main) process.exitCode = await run(process.argv.slice(2));
