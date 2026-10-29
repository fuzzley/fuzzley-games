#!/usr/bin/env node
/**
 * Prints how the autopilot plays every level at every speed.
 *
 *   yarn report:levels
 *
 * For each level and speed it prints the game time the autopilot took to
 * clear the level, the time of that it spent on the last three bricks the
 * level needed, how many times its paddle met a ball, and the lives it
 * lost. It plays from the level's number as the seed, as
 * `src/rules/autopilot.spec.ts` does, so the report and the spec play the
 * same games. It loads the rules and the autopilot through Vite, as the
 * game's build does. The report is how the difficulty ramp is tuned: a level
 * that takes long, or costs lives at Relaxed, is one to look at again.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runnerImport } from "vite";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The steps in a second of game time. */
const STEPS_A_SECOND = 120;

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
 * @property {(entry: LevelEntry) => unknown} parseLevel
 * @property {(level: unknown, speed: string, seed: number) => AutopilotReport} autoplay
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
  const [levels, speed, autopilot] = await Promise.all([
    load("src/rules/levels.ts"),
    load("src/rules/speed.ts"),
    load("src/testing/autopilot.ts"),
  ]);
  return /** @type {Game} */ ({
    levels: levels["LEVELS"],
    speeds: speed["SPEEDS"],
    parseLevel: levels["parseLevel"],
    autoplay: autopilot["autoplay"],
  });
}

/**
 * Returns a count of steps as the game time it takes, in minutes and
 * seconds.
 *
 * @param {number} steps
 * @returns {string}
 */
function timeOf(steps) {
  const seconds = Math.round(steps / STEPS_A_SECOND);
  return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * Returns a play's cell of the report: its time, its endgame's, its bounces
 * and its lives lost, or that it didn't clear the level.
 *
 * @param {AutopilotReport} report
 * @returns {string}
 */
function cellOf(report) {
  const time = timeOf(report.steps);
  const played = report.cleared ? time : `NOT CLEARED in ${time}`;
  return `${played} ${timeOf(report.endgameSteps)} ${String(report.bounces).padStart(4)} ${String(report.livesLost).padStart(2)}`;
}

const game = await loadGame();
const NAME_WIDTH = 18;
const CELL_WIDTH = 21;
console.log(
  "".padEnd(NAME_WIDTH) +
    game.speeds.map((speed) => speed.padEnd(CELL_WIDTH)).join("  "),
);
console.log(
  "".padEnd(NAME_WIDTH) +
    game.speeds
      .map(() => "time  last  hits lost".padEnd(CELL_WIDTH))
      .join("  "),
);
let failed = 0;
for (const entry of game.levels) {
  const level = game.parseLevel(entry);
  const cells = game.speeds.map((speed) => {
    const report = game.autoplay(level, speed, entry.number);
    if (!report.cleared) failed++;
    return cellOf(report).padEnd(CELL_WIDTH);
  });
  const name = `${String(entry.number).padStart(2)} ${entry.data.name}`;
  console.log(name.padEnd(NAME_WIDTH) + cells.join("  "));
}
if (failed > 0) {
  console.log(`\n${String(failed)} plays didn't clear their level.`);
  process.exitCode = 1;
}
