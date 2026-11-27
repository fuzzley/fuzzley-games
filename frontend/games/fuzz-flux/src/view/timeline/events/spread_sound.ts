// A burr spreading after a move, to its sound, as it sets out: the sound
// of the spread, whose flight and landing an element's event adds.

import type { BurrSpread } from "../../../rules/move/record";
import type { AfterPlay } from "../after_waves";
import { type Part, cue } from "../part";

/** Returns the sound of a burr setting out to spread. */
export function spreadSound(
  _spread: BurrSpread,
  play: AfterPlay,
): readonly Part[] {
  return [cue("burr-spread", play.atMs)];
}
