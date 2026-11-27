// The view's parts a level is played on the board with: the timelines the
// board plays, the picking and the ring the player's presses and keys play
// on, and the hint's clock. The board loads this file beside the scene,
// with import(), and the rest of the shell takes it by type alone, so only
// the scene's chunk carries the timeline's, the input's and the art's code.

import { handTimeline } from "../../view/idle/hand";
import { Hinting, hintTimeline } from "../../view/idle/hint";
import { Ring } from "../../view/input/keys";
import { Picking } from "../../view/input/picking";
import { heldTimelineOf, timelineOf } from "../../view/timeline/build";
import { pacedFeel } from "../../view/timeline/pace";

/** The view's parts a level is played on the board with. */
export const VIEW_KIT = {
  pacedFeel,
  timelineOf,
  heldTimelineOf,
  hintTimeline,
  handTimeline,
  Picking,
  Ring,
  Hinting,
} as const;

/** Describes the view's parts a level is played on the board with, as {@link VIEW_KIT} holds them. */
export type ViewKit = typeof VIEW_KIT;
