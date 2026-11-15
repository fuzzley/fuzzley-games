/**
 * The runs the scripts hand a page to take up, kept by the rules through
 * `src/testing/screenshot_api.ts` and stored as the game stores one: the
 * one `capture-screenshots.mjs` shows, and the one `check-layout.mjs`
 * checks the Cleared card over.
 */
import { join } from "node:path";
import { importThroughVite } from "@fz/dev/script";

/** @import { KeptGame, RunBegun, ScreenshotApi } from "../src/testing/script_api.ts" */

const ROOT = join(import.meta.dirname, "..");

/**
 * Where the game keeps the run under way: a copy of `SAVED_GAME_KEY` in
 * `src/app/play/saved_game.service.ts`, the shell's, which the scripts'
 * entries, fenced as the rules are, can't import.
 */
export const SAVED_GAME_KEY = "asteroid-breaker-game";

/**
 * The run the layout check's Cleared card is checked over, as
 * `clearingRun()` keeps it: the last written wave, so the trophy shows, on
 * a field the page fits to its own as it takes the run up.
 *
 * @type {RunBegun}
 */
export const CLEARING_RUN = {
  wave: 30,
  speed: "normal",
  seed: 30,
  torus: { width: 72, height: 40 },
};

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
 * Returns a run kept by the rules as a page's storage holds it, stamped
 * with the version the shell keeps it under.
 *
 * @param {ScreenshotApi} api
 * @param {KeptGame} saved
 * @returns {string}
 */
export function storedRun(api, saved) {
  return JSON.stringify({ version: api.savedGameVersion, ...saved });
}
