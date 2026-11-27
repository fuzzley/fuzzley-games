// A fuzzball a blast takes, as it is gathered: it hops off as the blast
// reaches it, unless it is a special the blast sets off.

import type { HitOf } from "../hits";
import type { Part } from "../part";
import { standingOn } from "../standing";
import type { WavePlay } from "../wave_play";
import { struckOff } from "./hop";

/** Returns the parts of a fuzzball a blast takes hopping off, or none for a special it sets off, which its own blast plays. */
export function gathered(
  hit: HitOf<"gathered">,
  atMs: number,
  play: WavePlay,
): readonly Part[] {
  return play.wave.blasts.some(({ piece }) => piece === hit.piece)
    ? []
    : struckOff(
        standingOn(play.grid, hit.square),
        hit.kind,
        atMs,
        play.before,
        play.feel,
      );
}
