#!/usr/bin/env node
/**
 * Prints how the autopilot plays every level at every speed.
 *
 *   yarn report:levels
 *
 * For each level and speed it prints the game time the autopilot took to
 * clear the level, the time of that it spent on the last three bricks the
 * level needed, how many times its paddle met a ball, and the lives it
 * lost. It plays each through the autopilot's `playLevel()`, as
 * `src/rules/autopilot.spec.ts` does, so the report and the spec play the
 * same games. It loads the rules and the autopilot through Vite, as the
 * game's build does. The report is how the difficulty ramp is tuned: a level
 * that takes long, or costs lives at Relaxed, is one to look at again.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runnerImport } from "vite";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** How wide the column of the levels' names is. */
const NAME_WIDTH = 18;

/** How wide each of a play's columns is: its time, its endgame's, its bounces and its lives lost. */
const COLUMN_WIDTHS = [5, 5, 8, 5];

/** The heading of each of a play's columns. */
const HEADINGS = ["time", "last", "bounces", "lost"];

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
 * @property {(entry: LevelEntry, speed: string) => AutopilotReport} playLevel
 */

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
 * Returns a play's cells, or their headings, each right-aligned in its
 * column.
 *
 * @param {readonly string[]} cells
 * @returns {string}
 */
function columns(cells) {
  return cells.map((cell, i) => cell.padStart(COLUMN_WIDTHS[i] ?? 0)).join(" ");
}

/**
 * Returns a play's cells: its time, or a dash if it didn't clear the level,
 * its endgame's, its bounces and its lives lost.
 *
 * @param {AutopilotReport} report
 * @param {number} stepSeconds
 * @returns {string}
 */
function playOf(report, stepSeconds) {
  return columns([
    report.cleared ? timeOf(report.steps, stepSeconds) : "-",
    timeOf(report.endgameSteps, stepSeconds),
    String(report.bounces),
    String(report.livesLost),
  ]);
}

const game = await loadGame();
const headings = columns(HEADINGS);
console.log(
  "".padEnd(NAME_WIDTH) +
    game.speeds.map((speed) => speed.padEnd(headings.length)).join("   "),
);
console.log(
  "".padEnd(NAME_WIDTH) + game.speeds.map(() => headings).join("   "),
);
let failed = 0;
for (const entry of game.levels) {
  const plays = game.speeds.map((speed) => {
    const report = game.playLevel(entry, speed);
    if (!report.cleared) failed++;
    return playOf(report, game.stepSeconds);
  });
  const name = `${String(entry.number).padStart(2)} ${entry.data.name}`;
  console.log(name.padEnd(NAME_WIDTH) + plays.join("   "));
}
if (failed > 0) {
  console.log(`\n${String(failed)} plays didn't clear their level (-).`);
  process.exitCode = 1;
}
