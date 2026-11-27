// A layer of dust swept off a square as a bunch beside it or a blast
// strikes it, with its sound: the square puffs as it shows what is left,
// and the dust's goal counts the layer.

import { squareOf } from "../../../rules/board/cells";
import type { HitOf } from "../hits";
import { type Part, cue } from "../part";
import type { WavePlay } from "../wave_play";

/** Returns the parts of a layer of dust swept off a square as a hit lands. */
export function dusted(
  hit: HitOf<"dusted">,
  atMs: number,
  play: WavePlay,
): readonly Part[] {
  return [
    cue("dust", atMs),
    {
      what: "dust",
      change: {
        atMs,
        at: squareOf(hit.square, play.grid.width),
        layers: hit.layersLeft,
      },
    },
    { what: "counted", atMs, counts: { what: "dust" } },
  ];
}
