#!/usr/bin/env node
/**
 * Prints how the autopilot plays every level at every preset speed.
 *
 *   yarn report:levels [--seeds <n>] [--height <n>]
 *   yarn report:levels --marks
 *
 * For each level and speed it prints the game time the autopilot took to
 * clear the level, the time of that it spent on the last three bricks the
 * level needed, how many times its paddle met a ball, the lives it lost,
 * its longest streak, the most bricks it broke since the paddle last met a
 * ball, and the longest it went between two touches of the paddle, any ball
 * meeting it or leaving it, or from the last to the play's end. It plays
 * each through the autopilot's `playLevel()`, as the specs in
 * `src/rules/levels/every_level/` do, so the report and the specs play the
 * same games, and it fails as the specs do: when a play doesn't clear its
 * level (`-`), or takes longer than the specs allow over its last bricks
 * (`!`). It marks a play that went past a minute between two touches of
 * the paddle (`^`), its only ball held out of reach or circling what can't
 * break, as one that hangs, and fails on none. It loads the rules and the
 * autopilot through Vite, as the game's build does. The report is how the
 * difficulty ramp is tuned: a level that takes long, or costs lives at
 * Relaxed, is one to look at again.
 *
 * With `--seeds`, it plays each level that many times at each speed, from
 * seeds of its own, and prints the middle time, the longest, the longest
 * endgame, the most lives lost, the middle of the longest streaks and the
 * longest any play went between two touches of the paddle, since the
 * capsules one seed lets fall can make a level look far easier or harder
 * than it is. It still marks and counts the endgames longer than the specs
 * allow, but fails only on a play that doesn't clear its level: across
 * many seeds, a few plays are unlucky however a level is drawn. On the
 * least field, it marks a level whose middle time at Relaxed, as printed,
 * is past 2:00 (`+`), as no level should be longer than its set there, and
 * fails on none.
 *
 * With `--height`, it plays every level on a field that many units tall,
 * as a tall screen lays it out, from the least height to the tallest, to
 * the autopilot's limits for that height (`limitsOf()`). It marks the
 * endgames longer than those allow, but fails only on a play that doesn't
 * clear its level, as the specs hold the tallest field to no endgame's limit.
 *
 * With `--marks`, it prints the mark each level's data should hold, the
 * streak its third star asks for, by the one rule that sets every mark:
 * the middle of the level's best streaks from twelve seeds at Normal on the
 * least field, rounded down to a multiple of 5, and never under 5. It fails
 * only on a play that doesn't clear its level.
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

/** @import { ReportColumns, Tally } from "@fz/dev/report" */
/** @import { ScriptIo, Stop } from "@fz/dev/script" */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The rule `--marks` gives each level's mark by: the middle of its best
 * streaks from `seeds` seeds at `speed`, rounded down to a multiple of
 * `step`, and `step` at least.
 */
const MARK_RULE = { seeds: 12, speed: "normal", step: 5 };

const USAGE = `Usage: yarn report:levels [options]

Prints how the autopilot plays every level at every preset speed.

  --seeds <n>     Play each level from n seeds of its own (default: from its
                  number alone)
  --height <n>    Play on a field n units tall (default: the shortest)
  --marks         Print each level's mark, the streak its third star asks
                  for: the middle of its best streaks from ${String(MARK_RULE.seeds)} seeds at
                  Normal, rounded down to a multiple of ${String(MARK_RULE.step)}, and ${String(MARK_RULE.step)} at least
  -h, --help      Show this message

Signs: - for a play that didn't clear its level; ! for a time over the last
bricks longer than the field allows; ^ for a play that went past a minute
between two touches of the paddle; and, with --seeds on the least field,
+ for a level whose middle time at Relaxed is past 2:00.`;

/**
 * The middle time, in seconds as the report prints it, past which `--seeds`
 * marks a level at the slowest speed, Relaxed, on the least field, as longer
 * than its set should be.
 */
const LONG_LEVEL_SECONDS = 120;

/**
 * The time between two touches of the paddle, in seconds as the report
 * prints it, past which it marks a play as one that hangs.
 */
const HANGING_SECONDS = 60;

/**
 * What a command line asks the report for.
 *
 * @typedef {object} Request
 * @property {number | undefined} seeds How many seeds each level is played
 *   from, or none for its number alone.
 * @property {string | undefined} height How tall a field `--height` asks
 *   for, as it was given, which the rules hold to their heights.
 * @property {boolean} marks Whether it asks for each level's mark instead.
 */

/**
 * A level as the rules list it.
 *
 * @typedef {object} LevelEntry
 * @property {number} number Its number in the order played, from 1.
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
 * @property {number} bestStreak
 * @property {number} longestAway
 */

/**
 * A play of a level as the report keeps it: the autopilot's report of it,
 * and the speed it was played at.
 *
 * @typedef {AutopilotReport & { speed: string }} Play
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
 * @property {boolean} tallerField Whether the field is taller than the
 *   least, whose endgames no spec holds to a limit, where `+` marks nothing.
 * @property {number} endgameLimit The most steps a play's endgame may take on that field.
 * @property {(entry: LevelEntry, speed: string, seed: number) => AutopilotReport} playLevel
 */

/**
 * Returns the columns the report shows of a level's plays at one speed,
 * from its number alone or from many seeds.
 *
 * @param {number | undefined} seeds
 * @param {Game} game
 * @returns {ReportColumns<Play>}
 */
function columnsOf(seeds, game) {
  if (seeds === undefined) {
    return {
      headings: ["time", "last", "bounces", "lost", "streak", "away"],
      widths: [5, 6, 8, 5, 7, 6],
      cellsOf: ([play]) =>
        play
          ? [
              timeOf(stepsOf(play), game.stepSeconds),
              endgameOf(play.endgameSteps, game),
              String(play.bounces),
              String(play.livesLost),
              String(play.bestStreak),
              awayOf(play.longestAway, game),
            ]
          : [],
    };
  }
  return {
    headings: ["middle", "most", "last", "lost", "streak", "away"],
    widths: [6, 5, 6, 5, 7, 6],
    cellsOf: (plays) => {
      const [middle, most] = middleAndMost(plays.map(stepsOf));
      return [
        middleOf(middle, plays[0]?.speed, game),
        timeOf(most, game.stepSeconds),
        endgameOf(Math.max(...plays.map((play) => play.endgameSteps)), game),
        String(Math.max(...plays.map((play) => play.livesLost))),
        String(middleStreakOf(plays)),
        awayOf(Math.max(...plays.map((play) => play.longestAway)), game),
      ];
    },
  };
}

/**
 * Returns the middle of some plays' longest streaks, the higher of the two
 * middles for an even number of them.
 *
 * @param {readonly AutopilotReport[]} plays
 * @returns {number}
 */
function middleStreakOf(plays) {
  // A level's plays at a speed are never none: --seeds plays one at least.
  return middleAndMost(plays.map((play) => play.bestStreak))[0] ?? 0;
}

/**
 * Returns a level's middle time at a speed, marked `+` where, at the slowest
 * speed on the least field, it is past {@link LONG_LEVEL_SECONDS}.
 *
 * @param {number | undefined} steps
 * @param {string | undefined} speed
 * @param {Game} game
 * @returns {string}
 */
function middleOf(steps, speed, game) {
  const long =
    !game.tallerField &&
    speed === game.speeds[0] &&
    steps !== undefined &&
    Number.isFinite(steps) &&
    Math.round(steps * game.stepSeconds) > LONG_LEVEL_SECONDS;
  return timeOf(steps, game.stepSeconds) + (long ? "+" : "");
}

/**
 * Returns the steps a play went between two touches of the paddle as the
 * game time they take, marked `^` where it hangs.
 *
 * @param {number} steps
 * @param {Game} game
 * @returns {string}
 */
function awayOf(steps, game) {
  return timeOf(steps, game.stepSeconds) + (hangs(steps, game) ? "^" : "");
}

/**
 * Returns whether a play that went so many steps between two touches of
 * the paddle hangs: past {@link HANGING_SECONDS}, as printed.
 *
 * @param {number} steps
 * @param {Game} game
 * @returns {boolean}
 */
function hangs(steps, game) {
  return Math.round(steps * game.stepSeconds) > HANGING_SECONDS;
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
    options: {
      ...SEEDS_OPTION,
      height: { type: "string" },
      marks: { type: "boolean" },
    },
    usage: USAGE,
  });
  if (isStop(read)) return read;
  const { height, marks = false } = read.values;
  if (marks && (read.values.seeds !== undefined || height !== undefined)) {
    return misread(
      `--marks plays ${String(MARK_RULE.seeds)} seeds at Normal on the least field, so it takes neither --seeds nor --height.`,
      USAGE,
    );
  }
  const seeds = readSeeds(read.values.seeds, USAGE);
  if (isStop(seeds)) return seeds;
  return { seeds, height, marks };
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
 * is longer than its field allows (`endgameLimit`).
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
 * played, and how many plays didn't clear their level, took longer over
 * their last bricks than the field allows or hung, and returns the code to exit
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
    : "the specs allow";
  return printReport(
    {
      entries: game.levels,
      speeds: game.speeds,
      seeds,
      play: (entry, speed, seed) => ({
        ...game.playLevel(entry, speed, seed),
        speed,
      }),
      ...columnsOf(seeds, game),
    },
    (plays) => [
      unclearedTally(plays, true),
      {
        count: plays.filter((play) => play.endgameSteps > game.endgameLimit)
          .length,
        says: `took longer than ${limit} over their level's last bricks (!)`,
        fails: seeds === undefined && !game.tallerField,
      },
      {
        count: plays.filter((play) => hangs(play.longestAway, game)).length,
        says: "went past a minute between two touches of the paddle (^)",
        fails: false,
      },
    ],
    print,
  );
}

/**
 * Prints each level's mark by {@link MARK_RULE}, a line at a time, beside
 * the middle of its best streaks, and how many plays didn't clear their
 * level, and returns the code to exit with: 1 where a play didn't, and 0
 * otherwise.
 *
 * @param {Game} game
 * @param {(line: string) => void} print
 * @returns {number}
 */
function reportMarks(game, print) {
  if (!game.speeds.includes(MARK_RULE.speed)) {
    throw new Error(
      `The rules have no speed "${MARK_RULE.speed}" to set marks at.`,
    );
  }
  return printReport(
    {
      entries: game.levels,
      speeds: [MARK_RULE.speed],
      seeds: MARK_RULE.seeds,
      play: game.playLevel,
      headings: ["streak", "mark"],
      widths: [7, 5],
      cellsOf: (plays) => {
        const streak = middleStreakOf(plays);
        return [String(streak), String(markOf(streak))];
      },
    },
    (plays) => [unclearedTally(plays, false)],
    print,
  );
}

/**
 * Returns a level's mark from the middle of its plays' best streaks, by
 * {@link MARK_RULE}: rounded down to a multiple of its step, and its step at
 * least.
 *
 * @param {number} streak
 * @returns {number}
 */
function markOf(streak) {
  const { step } = MARK_RULE;
  return Math.max(step, Math.floor(streak / step) * step);
}

/**
 * Counts the plays that didn't clear their level, which fail the report.
 *
 * @param {readonly AutopilotReport[]} plays
 * @param {boolean} signed Whether the table signs such a play with `-`,
 *   which the count then names.
 * @returns {Tally}
 */
function unclearedTally(plays, signed) {
  return {
    count: plays.filter((play) => !play.cleared).length,
    says: `didn't clear their level${signed ? " (-)" : ""}`,
    fails: true,
  };
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
  if (request.marks) return reportMarks(game, print);
  return report(game, request.seeds, print);
}

if (import.meta.main) process.exitCode = await run(process.argv.slice(2));
