// A bunch's note as it hops off: a chord on the move's ladder, its root on
// the wave's rung, a bunch later in the wave a rung higher, and a bigger
// bunch's chord with a note or two more above it, each a little later and
// softer than the one before, and the whole chord a little softer the
// higher its root, as the design's notes are.

import { noteVolumeOf } from "../../effects/ladder";
import type { FeelTuning } from "../feel";
import { type Part, noteCue } from "../part";

/**
 * Returns the cues of the chord of a bunch of some fuzzballs from a moment,
 * its root on a rung of the ladder, as loud as a share of a note's
 * loudness on that rung.
 */
export function chordOf(
  size: number,
  rung: number,
  atMs: number,
  volume: number,
  feel: FeelTuning,
): readonly Part[] {
  const shares = [
    1,
    ...(size >= feel.chordSecondFrom ? [feel.chordSecondVolume] : []),
    ...(size >= feel.chordThirdFrom ? [feel.chordThirdVolume] : []),
  ];
  return shares.map((share, above) =>
    noteCue(
      "note",
      atMs + above * feel.chordGapMs,
      rung + above * feel.chordRungs,
      volume * share * noteVolumeOf(rung),
    ),
  );
}
