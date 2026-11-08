import { formatPoints } from "@fz/core/format";
import { SAVED_GAME_VERSION } from "../rules/run/saved_game";
import { NEW_SHIP_GUARD_MS } from "../rules/tuning";
import { WAVES } from "../rules/waves/waves";
import { keptRun } from "./kept_run";
import type { ScreenshotApi } from "./script_api";

/**
 * What `tools/capture-screenshots.mjs` takes from the game, which it loads
 * through Vite: the run kept for the page to take up and the version it is
 * kept under, points as the game writes them, and how long a new ship
 * blinks.
 */
export const SCREENSHOT_API: ScreenshotApi = {
  keptRun: (run) => keptRun(WAVES, run),
  formatPoints,
  newShipGuardMs: NEW_SHIP_GUARD_MS,
  savedGameVersion: SAVED_GAME_VERSION,
};
