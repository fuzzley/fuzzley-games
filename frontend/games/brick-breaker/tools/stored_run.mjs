/**
 * The runs the scripts hand a page to take up, kept by the rules through
 * `src/testing/screenshot_api.ts` and stored as the game stores one: the
 * one `capture-screenshots.mjs` shows, which it keeps beside it, and the
 * one `check-layout.mjs` checks the Cleared card over.
 */
import { join } from "node:path";
import { importThroughVite } from "@fz/dev/script";

/** @import { BrickPlace, KeptGame, ScreenshotApi, ScreenshotRun } from "../src/testing/script_api.ts" */

const ROOT = join(import.meta.dirname, "..");

/**
 * Where the game keeps the run under way: a copy of `SAVED_GAME_KEY` in
 * `src/app/play/saved_game.service.ts`, the shell's, which the scripts'
 * entries, fenced as the rules are, can't import.
 */
export const SAVED_GAME_KEY = "brick-breaker-game";

/**
 * The run the layout check's Cleared card is checked over, as `keptRun()`
 * keeps it: Fuse, level 13, its row of tough bricks broken at double pay,
 * as under a dare, and the blast brick in the middle of its fuse broken, so
 * the fuse is lit. Once the run goes on, the fuse burns along its row,
 * breaking the rest, and clears the level with no ball launched, every
 * star won.
 *
 * @type {ScreenshotRun}
 */
export const CLEARING_RUN = {
  level: 13,
  speed: "normal",
  seed: 13,
  playedMs: 30_000,
  broken: [[2, 6], ...wholeRow(5)],
  worn: [],
  pay: 2,
};

/**
 * Returns the places of every column of a row of the grid.
 *
 * @param {number} row
 * @returns {BrickPlace[]}
 */
function wholeRow(row) {
  return Array.from({ length: 13 }, (_, column) => [row, column]);
}

/**
 * A run kept by the rules, and as a page's storage holds it.
 *
 * @typedef {{saved: KeptGame, stored: string}} StoredRun
 */

/**
 * Returns what the scripts take from the game's own code, `SCREENSHOT_API`
 * in `src/testing/screenshot_api.ts`, loaded through Vite.
 *
 * @returns {Promise<ScreenshotApi>}
 */
export async function loadScreenshotApi() {
  const module = await importThroughVite(
    join(ROOT, "src/testing/screenshot_api.ts"),
    ROOT,
  );
  return /** @type {ScreenshotApi} */ (module["SCREENSHOT_API"]);
}

/**
 * Returns a run kept by the rules, and as a page's storage holds it,
 * stamped with the version the shell keeps it under.
 *
 * @param {ScreenshotApi} api
 * @param {ScreenshotRun} run
 * @returns {StoredRun}
 */
export function storedRun(api, run) {
  const saved = api.keptRun(run);
  return {
    saved,
    stored: JSON.stringify({ version: api.savedGameVersion, ...saved }),
  };
}
