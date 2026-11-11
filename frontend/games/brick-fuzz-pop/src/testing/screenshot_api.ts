import { formatPoints } from "@fz/core/format";
import { shotOf } from "../rules/levels/certificate";
import { LEVELS } from "../rules/levels/levels";
import { describeShot } from "../rules/run/describe";
import { SAVED_GAME_VERSION } from "../rules/run/saved_game";
import { AIMS_PER_DEGREE, FIRST_AIM_DEGREES } from "../rules/tuning";
import { keptRun } from "./kept_run";
import type { ScreenshotApi } from "./script_api";

/**
 * What `tools/capture-screenshots.mjs` and `tools/check-layout.mjs` take
 * from the game, which they load through Vite: a run kept among the game's
 * levels for the page to take up and the version it is kept under, points
 * as the game writes them, and what it says of a shot the keys aim.
 */
export const SCREENSHOT_API: ScreenshotApi = {
  keptRun: (run) => keptRun(LEVELS, run),
  formatPoints,
  shotWords: (degrees, charge) =>
    describeShot(
      shotOf([(degrees - FIRST_AIM_DEGREES) * AIMS_PER_DEGREE, charge]),
    ),
  savedGameVersion: SAVED_GAME_VERSION,
};
