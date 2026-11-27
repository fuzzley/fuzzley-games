// A wisp going off, with its flutter: a copy of it flies a curve to each
// fuzzball it takes, one after another, each bowing the other way from the
// one before, and lands in its tufts and a thin ring as the wisp is gone.
// Two wisps swapped together send three; a wisp with a dasher or a puffer
// carries it to where it goes off.

import { squareOf } from "../../../rules/board/cells";
import type { Piece } from "../../../rules/catalog/pieces";
import type { Blast } from "../../../rules/move/record";
import { curveKeys } from "../curve";
import { RAISED, lookAt } from "../looks";
import { type Part, cue, spawns, tuftsOf } from "../part";
import type { Reach } from "../reach";
import { standingOn } from "../standing";
import type { WavePlay } from "../wave_play";

/** Returns the parts of a wisp, or a pair it is in, going off. */
export function wispOff(
  blast: Blast,
  reach: Reach,
  play: WavePlay,
): readonly Part[] {
  const { feel, grid } = play;
  const from = squareOf(blast.square, grid.width);
  const { piece } = standingOn(grid, blast.square);
  const drawn = asWisp(piece);
  return [
    cue("wisp", reach.startMs),
    { what: "leaves", piece: piece.id, atMs: reach.startMs },
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

/** Returns a piece as a wisp's copy draws it: a fuzzball wearing a wisp's fur, whatever it wore, or another piece as it is. */
function asWisp(piece: Piece): Piece {
  return piece.what === "fuzzball" ? { ...piece, special: "wisp" } : piece;
}
