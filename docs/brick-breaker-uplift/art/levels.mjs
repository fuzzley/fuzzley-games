// Loads the levels the Brick Breaker uplift's art and mocks draw: the
// game's own thirty, from its rules, and the plan's drafts, from ../levels/.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LEGEND } from "./scene.mjs";

const here = import.meta.dirname;

/**
 * @typedef {object} LevelData
 * @property {string} id
 * @property {string} name
 * @property {string[]} bricks
 * @property {string[]} [tints]
 * @property {number} [pace]
 * @property {number} [mark] The streak its third star asks for.
 * @property {string} [teaches] What the level is built around, in the drafts.
 * @property {string} [why] Why a level of the game is redrawn.
 * @property {{ every: number, most: number }} [bunnies]
 */

/**
 * @typedef {object} SetData
 * @property {string} id
 * @property {string} name
 * @property {string} [place]
 * @property {number} drops
 * @property {LevelData[]} levels
 */

/**
 * Reads a set of levels from a JSON file.
 *
 * @param {string} path
 * @returns {SetData}
 */
function readSet(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const GAME = join(
  here,
  "../../../frontend/games/brick-breaker/src/rules/levels",
);
const DRAFTS = join(here, "../levels");

/** The game's three sets, as its rules hold them. */
export const GAME_SETS = ["basics", "steel", "tricks"].map((id) =>
  readSet(join(GAME, `${id}.json`)),
);

/** The game's thirty levels, each with its number and its set's name. */
export const GAME_LEVELS = GAME_SETS.flatMap((set) =>
  set.levels.map((level) => ({ ...level, set: set.name })),
).map((level, i) => ({ ...level, number: i + 1 }));

/**
 * Returns a level of the game by its id.
 *
 * @param {string} id
 * @returns {LevelData & { number: number, set: string }}
 */
export function gameLevel(id) {
  const level = GAME_LEVELS.find((entry) => entry.id === id);
  if (!level) throw new Error(`The game has no level "${id}"`);
  return level;
}

/**
 * Returns a set of the plan's drafts, or nothing where it isn't written.
 *
 * @param {string} id
 * @returns {SetData | undefined}
 */
export function draftSet(id) {
  const path = join(DRAFTS, `${id}.json`);
  return existsSync(path) ? readSet(path) : undefined;
}

/**
 * Returns what a level asks for: the bricks it needs, the hits those take,
 * and its kinds of brick besides the plain one.
 *
 * @param {LevelData} level
 * @returns {{ needed: number, hits: number, kinds: string[] }}
 */
export function asksOf(level) {
  let needed = 0;
  let hits = 0;
  /** @type {Set<string>} */
  const kinds = new Set();
  for (const character of level.bricks.join("")) {
    const cell = LEGEND[character];
    if (!cell) continue;
    if (cell.kind !== "plain") kinds.add(cell.kind);
    if (!cell.needed) continue;
    needed += 1;
    hits +=
      cell.kind === "cage" || cell.kind === "ghost" ? 2 : (cell.hits ?? 1);
  }
  return { needed, hits, kinds: [...kinds] };
}

/**
 * Describes how the autopilot played a level at one speed, from twelve
 * seeds: its middle time, its longest, and its longest endgame.
 *
 * @typedef {object} Played
 * @property {string} middle
 * @property {string} most
 * @property {string} last
 */

/**
 * Reads a report of the game's `report:levels --seeds`, as the plan keeps
 * two in ../levels/.
 *
 * @param {string} name The file's name.
 * @returns {Record<string, { relaxed: Played, normal: Played, fast: Played }>}
 *   By the level's name.
 */
export function readReport(name) {
  /** @type {Record<string, { relaxed: Played, normal: Played, fast: Played }>} */
  const out = {};
  for (const row of readFileSync(join(DRAFTS, name), "utf8").split("\n")) {
    const found = /^\s*\d+ (.+?) {2,}(\S.*)$/.exec(row);
    if (!found) continue;
    const cells = found[2].trim().split(/\s+/);
    if (cells.length !== 12) continue;
    /** @type {(from: number) => Played} */
    const played = (from) => ({
      middle: cells[from],
      most: cells[from + 1],
      last: cells[from + 2],
    });
    out[found[1]] = { relaxed: played(0), normal: played(4), fast: played(8) };
  }
  return out;
}
