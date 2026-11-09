import { formatPoints } from "@fz/core/format";
import { LEVELS } from "../rules/levels/levels";
import { SAVED_GAME_VERSION } from "../rules/run/saved_game";
import { keptRun } from "./kept_run";
import type { ScreenshotApi } from "./script_api";

/**
 * What `tools/capture-screenshots.mjs` takes from the game, which it loads
 * through Vite: the run kept for the page to take up and the version it is
 * kept under, and points as the game writes them.
 */
export const SCREENSHOT_API: ScreenshotApi = {
  keptRun: (run) => keptRun(LEVELS, run),
  formatPoints,
  savedGameVersion: SAVED_GAME_VERSION,
};
