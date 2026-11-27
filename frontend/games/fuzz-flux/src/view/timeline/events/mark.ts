// A wave's mark, from "×2" to "×9", showing over each bunch of every wave
// of a move after its first, as the bunch hops off; a wave past the 9th
// shows none.

import { TIMES, type Times } from "../../art/frame_names";
import type { Part } from "../part";
import type { Place } from "../timeline";
import type { WavePlay } from "../wave_play";

/** Returns the part of a wave's mark over a bunch's middle as it hops off, or none for a move's first wave or one past the 9th. */
export function waveMarkOf(
  middle: Place,
  atMs: number,
  play: WavePlay,
): readonly Part[] {
  const times = timesOf(play.wave.number);
  return times === null
    ? []
    : [
        {
          what: "mark",
          mark: {
            atMs,
            at: { x: middle.x, y: middle.y - play.feel.markAboveSquares },
            times,
          },
        },
      ];
}

/** Returns the count a wave's mark shows, or null for a wave that shows none. */
function timesOf(wave: number): Times | null {
  return TIMES.find((times) => times === wave) ?? null;
}
