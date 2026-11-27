// A fuzzball a blast takes, as it is gathered: it hops off as the blast
// reaches it, or, for a special the blast sets off, which its own blast
// plays, its copy sets off to its goal all the same.

import type { HitOf } from "../hits";
import type { Part } from "../part";
import { standingOn } from "../standing";
import type { WavePlay } from "../wave_play";
import { gatheredFrom, struckOff } from "./hop";

/** Returns the parts of a fuzzball a blast takes hopping off, or of a special it sets off sending its copy to its goal. */
export function gathered(
  hit: HitOf<"gathered">,
  atMs: number,
  play: WavePlay,
): readonly Part[] {
  const standing = standingOn(play.grid, hit.square);
  return play.wave.blasts.some(({ piece }) => piece === hit.piece)
    ? gatheredFrom(standing, atMs)
    : struckOff(standing, hit.kind, atMs, play.before, play.feel);
}
