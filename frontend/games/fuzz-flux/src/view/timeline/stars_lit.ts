// How many stars the card at a level's end shows lit, by the level's end's
// beats: in a file of its own, which imports nothing of the timeline's by
// value, so the shell, which keeps the card to the scene's clock, carries
// no more of the view than it.

import { itemAt } from "@fz/core/records";
import type { EndBeats } from "./timeline";

/**
 * Returns how many of the stars a level's end card shows are lit at a
 * moment, every one past the last's beat, as a move that lands at once
 * shows: each lit once the moment stands past its beat, in the frame the
 * scene plays its note.
 */
export function starsLitAt(end: EndBeats, ms: number): number {
  let lit = 0;
  while (lit < end.starsMs.length && itemAt(end.starsMs, lit) < ms) {
    lit++;
  }
  return lit;
}
