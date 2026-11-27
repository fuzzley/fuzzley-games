// A frizzball going off: the board dims, and it swells, raised over the
// rest, as a bolt of static leaps to each fuzzball of its kind in turn,
// whose fur stands on end, each taking the special a frizzball swapped
// with one gives; then the board brightens as it bursts into tufts with a
// ring and a flash, and the board shakes. Its tufts are of the kind it
// took, where the sketch's are white, since no tuft is.

import { squareOf } from "../../../rules/board/cells";
import type { Piece } from "../../../rules/catalog/pieces";
import {
  type BlastId,
  SPECIAL_IDS,
  type SpecialId,
} from "../../../rules/catalog/specials";
import type { Blast } from "../../../rules/move/record";
import { blastShakePx } from "../../effects/shakes";
import { RAISED } from "../looks";
import { type Part, facing, moves, sets, spawns, tuftsOf } from "../part";
import type { Reach } from "../reach";
import { standingOn } from "../standing";
import type { WavePlay } from "../wave_play";

/** Every special that goes off alone. */
const SPECIALS: ReadonlySet<BlastId> = new Set(SPECIAL_IDS);

/** Returns the parts of a frizzball going off, alone or with a special, the board dimmed under it until it bursts. */
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
      const struck = standingOn(grid, square).piece;
      return [
        spawns({
          what: "bolt",
          atMs: leapsMs,
          ms: feel.boltMs,
          from: at,
          to: squareOf(square, grid.width),
        }),
        facing(struck.id, leapsMs, "eep"),
        ...moves(struck.id, leapsMs, feel.frizzedLiftMs, "out", { lift: 1 }),
        ...given(struck, leapsMs, play),
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

/**
 * Returns the parts of a plain fuzzball a frizzball strikes taking the
 * special its blast of its own names, as a frizzball's pair gives it, its
 * second fur growing in; none for one with no blast of its own, as none
 * has that a frizzball alone strikes.
 */
function given(struck: Piece, atMs: number, play: WavePlay): readonly Part[] {
  const special = play.wave.blasts.find(({ piece }) => piece === struck.id);
  return struck.what === "fuzzball" &&
    struck.special === null &&
    special !== undefined &&
    isSpecial(special.what)
    ? [
        {
          what: "becomes",
          piece: struck.id,
          atMs,
          drawn: { ...struck, special: special.what },
        },
        ...sets(struck.id, atMs, { furIn: 0 }),
        ...moves(struck.id, atMs, play.feel.givenFurMs, "back", { furIn: 1 }),
      ]
    : [];
}

/** Returns whether a blast is a special's going off alone. */
function isSpecial(what: BlastId): what is SpecialId {
  return SPECIALS.has(what);
}
