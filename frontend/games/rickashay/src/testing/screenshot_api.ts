import { LEVELS } from "../rules/levels/levels";
import warmUpMarks from "../rules/levels/marks/warm-up.json";
import { SAVED_GAME_VERSION } from "../rules/run/saved_game";
import { marksOf } from "../rules/run/stars";
import { keptRun } from "./kept_run";
import type { ScreenshotApi } from "./script_api";

/**
 * Each level's par and rally mark on each depth, as `yarn certify:levels`
 * writes them, a set's file each, every set's listed: a run kept begins on
 * its level's par, and a level whose set is left out has none.
 *
 * A run kept on its level stores nothing the marks decide, so the page
 * takes it up alike by its own (`GAME_MARKS`), which may be other marks.
 */
const MARKS = marksOf([warmUpMarks]);

/**
 * What the scripts under `tools/` take from the game, which they load
 * through Vite: a run kept among the game's levels, by their marks, for the
 * page to take up, and the version it is kept under.
 */
export const SCREENSHOT_API: ScreenshotApi = {
  keptRun: (run) => keptRun(LEVELS, MARKS, run),
  savedGameVersion: SAVED_GAME_VERSION,
};
