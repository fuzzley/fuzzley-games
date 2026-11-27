// A wisp going off: a copy of it flies a curve to each fuzzball it takes,
// one after another, each bowing the other way from the one before, and
// lands in its tufts and a thin ring as the wisp is gone.

import { squareOf } from "../../../rules/board/cells";
import type { Blast } from "../../../rules/move/record";
import { curveKeys } from "../curve";
import { RAISED, lookAt } from "../looks";
import { type Part, spawns, tuftsOf } from "../part";
import type { Reach } from "../reach";
import { standingOn } from "../standing";
import type { WavePlay } from "../wave_play";

/** Returns the parts of a wisp going off. */
export function wispOff(
  blast: Blast,
  reach: Reach,
  play: WavePlay,
): readonly Part[] {
  const { feel, grid } = play;
  const from = squareOf(blast.square, grid.width);
  const drawn = standingOn(grid, blast.square).piece;
  return [
    { what: "leaves", piece: drawn.id, atMs: reach.startMs },
    ...blast.strikes.flatMap(({ square }, index): readonly Part[] => {
      const to = squareOf(square, grid.width);
      const atMs = reach.startMs + index * feel.wispGapMs;
      const landsMs = atMs + feel.wispMs;
      const bend =
        index % 2 === 0 ? -feel.wispBendSquares : feel.wispBendSquares;
      return [
        {
          what: "sprite",
          sprite: {
            drawn: { what: "copy", piece: drawn, face: "happy" },
            fromMs: atMs,
            untilMs: landsMs,
            look: { ...lookAt(from), raise: RAISED.top },
            keys: curveKeys(from, to, bend, atMs, feel.wispMs, feel),
          },
        },
        ...tuftsOf(blast.kind, landsMs, to, feel.wispTufts, feel.tuftPower),
        spawns({
          what: "ring",
          atMs: landsMs,
          ms: feel.ringMs,
          at: to,
          radius: feel.wispRingSquares,
          ink: "white",
        }),
      ];
    }),
  ];
}
