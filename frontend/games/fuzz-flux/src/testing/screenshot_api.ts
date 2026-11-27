import { ELEMENT_RULES, WIND_RULE } from "../rules/elements/element_rules";
import { LEVELS } from "../rules/levels/levels";
import { SAVED_GAME_VERSION } from "../rules/run/saved_game";
import { keptRun } from "./kept_run";
import type { ScreenshotApi } from "./script_api";

/**
 * What the scripts under `tools/` take from the game, which they load
 * through Vite: a level in play kept among the game's levels, by its own
 * rules, for the page to take up, and the version it is kept under.
 */
export const SCREENSHOT_API: ScreenshotApi = {
  keptRun: (run) =>
    keptRun(LEVELS, { elements: ELEMENT_RULES, wind: WIND_RULE }, run),
  savedGameVersion: SAVED_GAME_VERSION,
};
