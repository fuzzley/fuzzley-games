// A frizzball going off: the board dims, and it swells, raised over the
// rest, as a bolt of static leaps to each fuzzball of its kind in turn,
// whose fur stands on end; then the board brightens as it bursts into
// tufts with a ring and a flash, and the board shakes. Its tufts are of
// the kind it took, where the sketch's are white, since no tuft is.

import { squareOf } from "../../../rules/board/cells";
import type { Blast } from "../../../rules/move/record";
import { blastShakePx } from "../../effects/shakes";
import { RAISED } from "../looks";
import { type Part, facing, moves, sets, spawns, tuftsOf } from "../part";
import type { Reach } from "../reach";
import { standingOn } from "../standing";
import type { WavePlay } from "../wave_play";

/** Returns the parts of a frizzball going off, the board dimmed under it until it bursts. */
export function frizzballOff(
  blast: Blast,
  reach: Reach,
  play: WavePlay,
): readonly Part[] {
  const { feel, grid } = play;
  const at = squareOf(blast.square, grid.width);
  const { burstMs } = reach;
  const swells: readonly Part[] =
    blast.piece === null
      ? []
      : [
          ...sets(blast.piece, reach.startMs, { raise: RAISED.top, lift: 1 }),
          ...moves(blast.piece, reach.startMs, feel.frizzballSwellMs, "back", {
            scaleX: feel.frizzballSwellScale,
            scaleY: feel.frizzballSwellScale,
          }),
          ...moves(blast.piece, burstMs, feel.frizzballBurstMs, "out", {
            scaleX: feel.frizzballBurstScale,
            scaleY: feel.frizzballBurstScale,
            fade: 1,
          }),
          {
            what: "leaves",
            piece: blast.piece,
            atMs: burstMs + feel.frizzballBurstMs,
          },
        ];
  return [
    {
      what: "dim",
      key: {
        atMs: reach.startMs,
        ms: 0,
        to: feel.frizzballDim,
        easing: "linear",
      },
    },
    ...swells,
    ...blast.strikes.flatMap(({ square }, index): readonly Part[] => {
      const leapsMs = reach.startMs + index * reach.leapMs;
      const struck = standingOn(grid, square).piece.id;
      return [
        spawns({
          what: "bolt",
          atMs: leapsMs,
          ms: feel.boltMs,
          from: at,
          to: squareOf(square, grid.width),
        }),
        facing(struck, leapsMs, "eep"),
        ...moves(struck, leapsMs, feel.frizzedLiftMs, "out", { lift: 1 }),
      ];
    }),
    {
      what: "dim",
      key: { atMs: burstMs, ms: feel.frizzballUndimMs, to: 0, easing: "out" },
    },
    ...tuftsOf(
      blast.kind,
      burstMs,
      at,
      feel.frizzballTufts,
      feel.frizzballTuftPower,
    ),
    spawns({
      what: "ring",
      atMs: burstMs,
      ms: feel.frizzballRingMs,
      at,
      radius: feel.frizzballRingSquares,
      ink: "white",
    }),
    spawns({
      what: "flash",
      atMs: burstMs,
      ms: feel.flashMs,
      at,
      radius: feel.frizzballFlashSquares,
    }),
    spawns({
      what: "shake",
      atMs: burstMs,
      px: blastShakePx(blast.what, feel),
    }),
  ];
}
