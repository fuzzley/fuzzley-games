import { formatPoints } from "@fz/core/format";
import { LEVEL_MARKS } from "../rules/levels/level_marks";
import { LEVELS } from "../rules/levels/levels";
import { describeAim } from "../rules/run/describe";
import { SAVED_GAME_VERSION } from "../rules/run/saved_game";
import { keptRun } from "./kept_run";
import type { ScreenshotApi } from "./script_api";

/**
 * What the scripts under `tools/` take from the game, which they load
 * through Vite: a run kept among the game's levels, by their marks, for the
 * page to take up, the version it is kept under, points as the game writes
 * them, and what it says of an aim the keys turn.
 */
export const SCREENSHOT_API: ScreenshotApi = {
  keptRun: (run) => keptRun(LEVELS, LEVEL_MARKS, run),
  formatPoints,
  aimWords: describeAim,
  savedGameVersion: SAVED_GAME_VERSION,
};
