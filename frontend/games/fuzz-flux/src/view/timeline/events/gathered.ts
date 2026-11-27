// A fuzzball a blast takes, as it is gathered: it hops off as the blast
// reaches it, or, for a special the blast sets off, which its own blast
// plays, its copy sets off to its goal all the same; and the first few a
// wave's blasts take each pop a bubble, climbing a few rungs from the
// wave's and round again.

import type { HitOf } from "../hits";
import { type Part, noteCue } from "../part";
import { standingOn } from "../standing";
import type { WavePlay } from "../wave_play";
import { gatheredFrom, struckOff } from "./hop";

/** Returns the parts of a fuzzball a blast takes hopping off, or of a special it sets off sending its copy to its goal, with its bubble. */
export function gathered(
  hit: HitOf<"gathered">,
  atMs: number,
  play: WavePlay,
): readonly Part[] {
  const { feel } = play;
  const standing = standingOn(play.grid, hit.square);
  const order = struckOrderOf(hit, play);
  return [
    ...(order <= feel.mostStruckBubbles
      ? [
          noteCue(
            "pop",
            atMs,
            play.before + (order % feel.struckBubbleRungs),
            feel.struckBubbleVolume,
          ),
        ]
      : []),
    ...(play.wave.blasts.some(({ piece }) => piece === hit.piece)
      ? gatheredFrom(standing, atMs)
      : struckOff(standing, hit.kind, atMs, play.before, feel)),
  ];
}

/** Returns a fuzzball's place, from 1, among those its wave's blasts gather, in the order its record holds them. */
function struckOrderOf(hit: HitOf<"gathered">, play: WavePlay): number {
  return (
    play.wave.hits
      .flatMap((each) =>
        each.what === "gathered" && each.blast !== null ? [each.piece] : [],
      )
      .indexOf(hit.piece) + 1
  );
}
