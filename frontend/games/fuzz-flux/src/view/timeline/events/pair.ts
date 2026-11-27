// Two specials swapped together winding up as the swap ends: the one left
// to be seen, the frizzball where there is one, stands on the square they
// met on as the pair, under the first's id, and the other is gone in its
// tufts; a ring spreads, with the pair's sound, and the pair swells, its
// fur on end, until it goes off. The goal of each one's kind counts it as they meet.

import type { FeelTuning } from "../feel";
import { RAISED, restingFace } from "../looks";
import { type Part, cue, facing, moves, sets, spawns, tuftsOf } from "../part";
import type { Standing } from "../standing";

/**
 * Returns the parts of a pair winding up from a moment, the piece swapped
 * from standing now on the square of the one swapped with.
 */
export function pairWindUp(
  from: Standing,
  to: Standing,
  atMs: number,
  feel: FeelTuning,
): readonly Part[] {
  const frizzballSeen =
    to.piece.what === "frizzball" && from.piece.what !== "frizzball";
  const gone = frizzballSeen ? from : to;
  const id = from.piece.id;
  const seen: readonly Part[] = frizzballSeen
    ? [
        { what: "becomes", piece: id, atMs, drawn: { ...to.piece, id } },
        facing(id, atMs, restingFace(to.piece)),
      ]
    : [];
  return [
    cue("pair", atMs),
    ...seen,
    { what: "leaves", piece: to.piece.id, atMs },
    spawns({
      what: "ring",
      atMs,
      ms: feel.pairMs,
      at: to.at,
      radius: feel.pairRingSquares,
      ink: "white",
    }),
    ...tuftsOf(
      gone.piece.what === "fuzzball" ? gone.piece.kind : null,
      atMs,
      to.at,
      feel.pairTufts,
      feel.pairTuftPower,
    ),
    ...[from.piece, to.piece].flatMap((piece): readonly Part[] =>
      piece.what === "fuzzball"
        ? [
            {
              what: "counted",
              atMs,
              counts: { what: "gather", kind: piece.kind },
            },
          ]
        : [],
    ),
    ...sets(id, atMs, { lift: 1, raise: RAISED.goingOff }),
    ...moves(id, atMs, feel.pairMs, "in-out", {
      scaleX: feel.pairScale,
      scaleY: feel.pairScale,
    }),
  ];
}
