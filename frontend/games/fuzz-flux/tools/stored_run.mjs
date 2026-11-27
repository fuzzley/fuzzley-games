/**
 * What the scripts store for a page to take up: a level in play, kept by
 * the rules through `src/testing/screenshot_api.ts`, as the game stores
 * one. `check-layout.mjs` checks the layout over such levels ended, and
 * `capture-screenshots.mjs` shows one mid-move.
 */
import { join } from "node:path";
import { importThroughVite } from "@fz/dev/script";

/** @import { ScreenshotApi, ScriptRun } from "../src/testing/script_api.ts" */

const ROOT = join(import.meta.dirname, "..");

/**
 * Where the game keeps the level in play: a copy of `SAVED_GAME_KEY` in
 * `src/app/play/saved_game.service.ts`, the shell's, which the scripts'
 * entries, fenced as the rules are, can't import.
 */
export const SAVED_GAME_KEY = "fuzz-flux-game";

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
 * Returns a level in play kept by the rules as a page's storage holds it,
 * stamped with the version the shell keeps it under.
 *
 * @param {ScreenshotApi} api
 * @param {ScriptRun} run
 * @returns {string}
 */
export function storedRun(api, run) {
  return JSON.stringify({ version: api.savedGameVersion, ...api.keptRun(run) });
}
