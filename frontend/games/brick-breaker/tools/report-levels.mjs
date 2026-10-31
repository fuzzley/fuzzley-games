#!/usr/bin/env node
/**
 * Prints how the autopilot plays every level at every preset speed.
 *
 *   yarn report:levels [--seeds <n>] [--height <n>]
 *
 * For each level and speed it prints the game time the autopilot took to
 * clear the level, the time of that it spent on the last three bricks the
 * level needed, how many times its paddle met a ball, and the lives it
 * lost. It plays each through the autopilot's `playLevel()`, as
 * `src/rules/autopilot.spec.ts` does, so the report and the spec play the
 * same games, and it fails as the spec does: when a play doesn't clear its
 * level (`-`), or takes longer than the spec allows over its last bricks
 * (`!`). It loads the rules and the autopilot through Vite, as the game's
 * build does. The report is how the difficulty ramp is tuned: a level that
 * takes long, or costs lives at Relaxed, is one to look at again.
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
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { runnerImport } from "vite";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** How wide the column of the levels' names is. */
const NAME_WIDTH = 18;

/** How far apart each level's seeds start with `--seeds`, so no two levels share one. */
const SEED_STRIDE = 1000;

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
 * The plays the report makes of each level at each speed, and the columns
 * it shows of them.
 *
 * @typedef {object} Layout
 * @property {(entry: LevelEntry) => number[]} seedsOf The seeds a level is played from.
 * @property {readonly string[]} headings The heading of each column.
 * @property {readonly number[]} widths How wide each column is.
 * @property {boolean} strict Whether an endgame longer than the spec allows fails the report.
 * @property {(plays: ReadonlyArray<AutopilotReport>, game: Game) => string[]} cellsOf
 *   Returns the columns' cells for a level's plays at one speed.
 */

/** @type {Layout} */
const ONE_PLAY = {
  seedsOf: (entry) => [entry.number],
  headings: ["time", "last", "bounces", "lost"],
  widths: [5, 6, 8, 5],
  strict: true,
  cellsOf: ([play], game) =>
    play
      ? [
          play.cleared ? timeOf(play.steps, game) : "-",
          endgameOf(play.endgameSteps, game),
          String(play.bounces),
          String(play.livesLost),
        ]
      : [],
};

/**
 * Returns the layout of a report that plays each level from a number of
 * seeds at each speed.
 *
 * @param {number} count
 * @returns {Layout}
 */
function manyPlays(count) {
  return {
    seedsOf: (entry) =>
      Array.from({ length: count }, (_, i) => entry.number * SEED_STRIDE + i),
    headings: ["middle", "most", "last", "lost"],
    widths: [6, 5, 6, 5],
    strict: false,
    cellsOf: (plays, game) => {
      const steps = plays
        .map((play) => (play.cleared ? play.steps : Number.POSITIVE_INFINITY))
        .sort((a, b) => a - b);
      const time = (/** @type {number | undefined} */ value) =>
        value === undefined || value === Number.POSITIVE_INFINITY
          ? "-"
          : timeOf(value, game);
      return [
        time(steps[Math.floor(steps.length / 2)]),
        time(steps.at(-1)),
        endgameOf(Math.max(...plays.map((play) => play.endgameSteps)), game),
        String(Math.max(...plays.map((play) => play.livesLost))),
      ];
    },
  };
}

/**
 * Returns a module of the game's source, loaded through Vite.
 *
 * @param {string} file Its path from the workspace's folder.
 * @returns {Promise<Record<string, unknown>>}
 */
async function load(file) {
  const { module } = await runnerImport(join(ROOT, file), {
    configFile: false,
    root: ROOT,
    logLevel: "silent",
  });
  return /** @type {Record<string, unknown>} */ (module);
}

/**
 * Returns the game as the report plays it, on a field as tall as `--height`
 * asks, the least by default, or throws an error that says what is wrong
 * with the height.
 *
 * @param {string | undefined} heightAsked
 * @returns {Promise<Game>}
 */
async function loadGame(heightAsked) {
  const [levels, speed, tuning, autopilot] = await Promise.all([
    load("src/rules/levels.ts"),
    load("src/rules/speed.ts"),
    load("src/rules/tuning.ts"),
    load("src/testing/autopilot.ts"),
  ]);
  const rules = /** @type {Rules} */ ({
    levels: levels["LEVELS"],
    speeds: speed["PRESET_SPEEDS"],
    stepSeconds: tuning["STEP_S"],
    leastHeight: tuning["FIELD_HEIGHT"],
    tallest: tuning["TALLEST_FIELD"],
    limitsOf: autopilot["limitsOf"],
    playLevel: autopilot["playLevel"],
  });
  const height = heightOf(heightAsked, rules);
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
 * Returns the layout `--seeds` asks for, or throws an error that says what
 * is wrong with it.
 *
 * @param {string | undefined} seeds
 * @returns {Layout}
 */
function layoutAsked(seeds) {
  if (seeds === undefined) return ONE_PLAY;
  const count = Number(seeds);
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`--seeds takes a whole number from 1, not "${seeds}".`);
  }
  return manyPlays(count);
}

/**
 * Returns the field's height `--height` asks for, the least by default, or
 * throws an error that says what is wrong with it.
 *
 * @param {string | undefined} height
 * @param {Rules} rules
 * @returns {number}
 */
function heightOf(height, rules) {
  if (height === undefined) return rules.leastHeight;
  const units = Number(height);
  if (
    !Number.isInteger(units) ||
    units < rules.leastHeight ||
    units > rules.tallest
  ) {
    throw new Error(
      `--height takes a whole number from ${String(rules.leastHeight)} to ${String(rules.tallest)}, not "${height}".`,
    );
  }
  return units;
}

/**
 * Returns a count of steps as the game time it takes, in minutes and
 * seconds.
 *
 * @param {number} steps
 * @param {Game} game
 * @returns {string}
 */
function timeOf(steps, game) {
  const seconds = Math.round(steps * game.stepSeconds);
  return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, "0")}`;
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
  return timeOf(steps, game) + (steps > game.endgameLimit ? "!" : "");
}

/**
 * Returns a speed's cells, or their headings, each right-aligned in its
 * column.
 *
 * @param {readonly string[]} cells
 * @param {Layout} layout
 * @returns {string}
 */
function columns(cells, layout) {
  return cells.map((cell, i) => cell.padStart(layout.widths[i] ?? 0)).join(" ");
}

const { values: asked } = parseArgs({
  options: { seeds: { type: "string" }, height: { type: "string" } },
});
const layout = layoutAsked(asked.seeds);
const game = await loadGame(asked.height);
const headings = columns(layout.headings, layout);
console.log(
  "".padEnd(NAME_WIDTH) +
    game.speeds.map((speed) => speed.padEnd(headings.length)).join("   "),
);
console.log(
  "".padEnd(NAME_WIDTH) + game.speeds.map(() => headings).join("   "),
);
let uncleared = 0;
let slow = 0;
for (const entry of game.levels) {
  const cells = game.speeds.map((speed) => {
    const plays = layout
      .seedsOf(entry)
      .map((seed) => game.playLevel(entry, speed, seed));
    uncleared += plays.filter((play) => !play.cleared).length;
    slow += plays.filter(
      (play) => play.endgameSteps > game.endgameLimit,
    ).length;
    return columns(layout.cellsOf(plays, game), layout);
  });
  const name = `${String(entry.number).padStart(2)} ${entry.data.name}`;
  console.log(name.padEnd(NAME_WIDTH) + cells.join("   "));
}
if (uncleared > 0 || slow > 0) console.log();
if (uncleared > 0) {
  console.log(`${String(uncleared)} plays didn't clear their level (-).`);
}
if (slow > 0) {
  const limit = game.tallerField
    ? `a field ${String(game.height)} tall allows`
    : "the spec allows";
  console.log(
    `${String(slow)} plays took longer than ${limit} over their level's last bricks (!).`,
  );
}
const strict = layout.strict && !game.tallerField;
if (uncleared > 0 || (strict && slow > 0)) process.exitCode = 1;
