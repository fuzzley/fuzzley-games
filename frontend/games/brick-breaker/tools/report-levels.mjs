#!/usr/bin/env node
/**
 * Prints how the autopilot plays every level at every speed.
 *
 *   yarn report:levels [--seeds <n>]
 *
 * For each level and speed it prints the game time the autopilot took to
 * clear the level, the time of that it spent on the last three bricks the
 * level needed, how many times its paddle met a ball, and the lives it
 * lost. It plays each through the autopilot's `playLevel()`, as
 * `src/rules/autopilot.spec.ts` does, so the report and the spec play the
 * same games. It loads the rules and the autopilot through Vite, as the
 * game's build does. The report is how the difficulty ramp is tuned: a level
 * that takes long, or costs lives at Relaxed, is one to look at again.
 *
 * With `--seeds`, it plays each level that many times at each speed, from
 * seeds of its own, and prints the middle time, the longest, the longest
 * endgame and the most lives lost, since the capsules one seed lets fall can
 * make a level look far easier or harder than it is.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { runnerImport } from "vite";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** How wide the column of the levels' names is. */
const NAME_WIDTH = 18;

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
 * What the script takes from the rules and the autopilot.
 *
 * @typedef {object} Game
 * @property {readonly LevelEntry[]} levels Every level, in the order played.
 * @property {readonly string[]} speeds Every speed, slowest first.
 * @property {number} stepSeconds The game time a step takes, in seconds.
 * @property {(entry: LevelEntry, speed: string, seed?: number) => AutopilotReport} playLevel
 */

/**
 * The plays the report makes of each level at each speed, and the columns
 * it shows of them.
 *
 * @typedef {object} Layout
 * @property {(entry: LevelEntry) => number[]} seedsOf The seeds a level is played from.
 * @property {readonly string[]} headings The heading of each column.
 * @property {readonly number[]} widths How wide each column is.
 * @property {(plays: AutopilotReport[], stepSeconds: number) => string[]} cellsOf
 *   Returns the columns' cells for a level's plays at one speed.
 */

/** One play of each level at each speed, from its number, as the spec plays it. */
const ONE_PLAY = {
  /**
   * @param {LevelEntry} entry
   * @returns {number[]}
   */
  seedsOf: (entry) => [entry.number],
  headings: ["time", "last", "bounces", "lost"],
  widths: [5, 5, 8, 5],
  /**
   * @param {readonly AutopilotReport[]} plays
   * @param {number} stepSeconds
   * @returns {string[]}
   */
  cellsOf: ([play], stepSeconds) =>
    play
      ? [
          play.cleared ? timeOf(play.steps, stepSeconds) : "-",
          timeOf(play.endgameSteps, stepSeconds),
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
      Array.from({ length: count }, (_, i) => entry.number * 1000 + i),
    headings: ["middle", "most", "last", "lost"],
    widths: [6, 5, 5, 5],
    cellsOf: (plays, stepSeconds) => {
      const steps = plays
        .map((play) => (play.cleared ? play.steps : Number.POSITIVE_INFINITY))
        .sort((a, b) => a - b);
      const time = (/** @type {number | undefined} */ value) =>
        value === undefined || value === Number.POSITIVE_INFINITY
          ? "-"
          : timeOf(value, stepSeconds);
      return [
        time(steps[Math.floor(steps.length / 2)]),
        time(steps.at(-1)),
        timeOf(
          Math.max(...plays.map((play) => play.endgameSteps)),
          stepSeconds,
        ),
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
 * Returns what the script takes from the game.
 *
 * @returns {Promise<Game>}
 */
async function loadGame() {
  const [levels, speed, tuning, autopilot] = await Promise.all([
    load("src/rules/levels.ts"),
    load("src/rules/speed.ts"),
    load("src/rules/tuning.ts"),
    load("src/testing/autopilot.ts"),
  ]);
  return /** @type {Game} */ ({
    levels: levels["LEVELS"],
    speeds: speed["SPEEDS"],
    stepSeconds: tuning["STEP_S"],
    playLevel: autopilot["playLevel"],
  });
}

/**
 * Returns the layout the command line asks for, or throws an error that
 * says what is wrong with it.
 *
 * @returns {Layout}
 */
function layoutAsked() {
  const { values } = parseArgs({ options: { seeds: { type: "string" } } });
  if (values.seeds === undefined) return ONE_PLAY;
  const count = Number(values.seeds);
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(
      `--seeds takes a whole number from 1, not "${values.seeds}".`,
    );
  }
  return manyPlays(count);
}

/**
 * Returns a count of steps as the game time it takes, in minutes and
 * seconds.
 *
 * @param {number} steps
 * @param {number} stepSeconds
 * @returns {string}
 */
function timeOf(steps, stepSeconds) {
  const seconds = Math.round(steps * stepSeconds);
  return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, "0")}`;
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

const layout = layoutAsked();
const game = await loadGame();
const headings = columns(layout.headings, layout);
console.log(
  "".padEnd(NAME_WIDTH) +
    game.speeds.map((speed) => speed.padEnd(headings.length)).join("   "),
);
console.log(
  "".padEnd(NAME_WIDTH) + game.speeds.map(() => headings).join("   "),
);
let failed = 0;
for (const entry of game.levels) {
  const speeds = game.speeds.map((speed) => {
    const plays = layout
      .seedsOf(entry)
      .map((seed) => game.playLevel(entry, speed, seed));
    failed += plays.filter((play) => !play.cleared).length;
    return columns(layout.cellsOf(plays, game.stepSeconds), layout);
  });
  const name = `${String(entry.number).padStart(2)} ${entry.data.name}`;
  console.log(name.padEnd(NAME_WIDTH) + speeds.join("   "));
}
if (failed > 0) {
  console.log(`\n${String(failed)} plays didn't clear their level (-).`);
  process.exitCode = 1;
}
