// The wind turning after a move, to its sound, as it starts: the sound of
// the gust, whose lines and sway an element's event adds.

import type { Gust } from "../../../rules/move/record";
import type { AfterPlay } from "../after_waves";
import { type Part, cue } from "../part";

/** Returns the sound of the wind starting to turn. */
export function gustSound(_gust: Gust, play: AfterPlay): readonly Part[] {
  return [cue("gust", play.atMs)];
}
