/**
 * The runs the scripts hand a page to take up, kept by the rules through
 * `src/testing/screenshot_api.ts` and stored as the game stores one: the
 * one `capture-screenshots.mjs` shows and the one `check-layout.mjs` checks
 * the layout over.
 */
import { join } from "node:path";
import { importThroughVite } from "@fz/dev/script";

/** @import { ScreenshotApi, ScriptRun, ScriptSavedGame } from "../src/testing/script_api.ts" */

const ROOT = join(import.meta.dirname, "..");

/**
 * Where the game keeps the run under way: a copy of `SAVED_GAME_KEY` in
 * `src/app/play/saved_game.service.ts`, the shell's, which the scripts'
 * entries, fenced as the rules are, can't import.
 */
export const SAVED_GAME_KEY = "brick-fuzz-pop-game";

/**
 * The run the layout check's second pass takes up: begun on Hello, wall on
 * a field 11 deep, and a round played straight up, uncharged, which leaves
 * its wall on row 4, a row under any a level opens on.
 *
 * @type {ScriptRun}
 */
export const LAYOUT_RUN = { level: 1, depth: 11, shots: [[328, 0]] };

/**
 * A run kept by the rules, and as a page's storage holds it.
 *
 * @typedef {{saved: ScriptSavedGame, stored: string}} StoredRun
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
 * @param {ScriptRun} run
 * @returns {StoredRun}
 */
export function storedRun(api, run) {
  const saved = api.keptRun(run);
  return {
    saved,
    stored: JSON.stringify({ version: api.savedGameVersion, ...saved }),
  };
}
