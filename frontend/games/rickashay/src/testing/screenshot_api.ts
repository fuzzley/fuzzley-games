import { formatPoints } from "@fz/core/format";
import { LEVELS } from "../rules/levels/levels";
import anglesMarks from "../rules/levels/marks/angles.json";
import warmUpMarks from "../rules/levels/marks/warm-up.json";
import { describeAim } from "../rules/run/describe";
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
const MARKS = marksOf([warmUpMarks, anglesMarks]);

/**
 * What the scripts under `tools/` take from the game, which they load
 * through Vite: a run kept among the game's levels, by their marks, for the
 * page to take up, the version it is kept under, points as the game writes
 * them, and what it says of an aim the keys turn.
 */
export const SCREENSHOT_API: ScreenshotApi = {
  keptRun: (run) => keptRun(LEVELS, MARKS, run),
  formatPoints,
  aimWords: describeAim,
  savedGameVersion: SAVED_GAME_VERSION,
};
