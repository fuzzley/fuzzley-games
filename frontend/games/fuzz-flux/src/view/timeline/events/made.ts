// A special made by a bunch: it shows swollen, its fur on end and its
// second fur not yet grown, and settles on a spring that rings twice as
// its fur lies down, its second fur grows in and it glows white; rings
// spread, tufts fly and the board shakes. A frizzball made dims the board,
// and everyone on it turns to look, wide-eyed.

import type { KindId } from "../../../rules/catalog/kinds";
import type { Making } from "../../../rules/move/record";
import { FRAMES } from "../../art/frame_names";
import { madeShakePx } from "../../effects/shakes";
import { pieceMadeOf } from "../board_after";
import type { FeelTuning } from "../feel";
import { RAISED, lookAt, restingFace } from "../looks";
import { type Part, facing, moves, sets, spawns } from "../part";
import type { Standing } from "../standing";
import type { Look, Place } from "../timeline";

/** Describes a special a bunch makes, and where. */
export interface Made {
  readonly making: Making;
  /** The bunch's kind. */
  readonly kind: KindId;
  readonly at: Place;
  /** Whether the fuzzball on its square stays to become it, rather than a new piece showing. */
  readonly stays: boolean;
  /** Everyone else on the board, who turns to look at a frizzball made. */
  readonly onlookers: readonly Standing[];
}

/** Returns the parts of a special made, from the moment it shows. */
export function madeOf(
  made: Made,
  atMs: number,
  feel: FeelTuning,
): readonly Part[] {
  const piece = pieceMadeOf(made.making.what, made.making.piece, made.kind);
  const id = piece.id;
  const swollen: Partial<Look> = {
    x: made.at.x,
    y: made.at.y,
    scaleX: feel.madeScale,
    scaleY: feel.madeScale,
    lift: 1,
    furIn: 0,
    raise: RAISED.made,
    lookX: 0,
    lookY: 0,
  };
  const shows: readonly Part[] = made.stays
    ? [
        { what: "becomes", piece: id, atMs, drawn: piece },
        ...sets(id, atMs, swollen),
        facing(id, atMs, "eep"),
      ]
    : [
        {
          what: "shows",
          piece,
          atMs,
          look: { ...lookAt(made.at), ...swollen },
          face: "eep",
        },
      ];
  return [
    ...shows,
    ...moves(id, atMs, feel.madeMs, "spring", { scaleX: 1, scaleY: 1 }),
    ...moves(id, atMs, feel.madeFurDownMs, "out", { lift: 0 }),
    ...moves(id, atMs, feel.madeFurMs, "back", { furIn: 1 }),
    { what: "glow", piece: id, atMs, ms: feel.madeGlowMs, amount: 1 },
    spawns({
      what: "ring",
      atMs,
      ms: feel.madeWhiteRingMs,
      at: made.at,
      radius: feel.madeWhiteRingSquares,
      ink: "white",
    }),
    spawns({
      what: "ring",
      atMs: atMs + feel.madeInkRingAfterMs,
      ms: feel.madeInkRingMs,
      at: made.at,
      radius: feel.madeInkRingSquares,
      ink: piece.what === "frizzball" ? "frizzball" : made.kind,
    }),
    // Even a frizzball made throws the tufts of the bunch's kind, there
    // being no tuft of its own fur.
    spawns({
      what: "fluff",
      atMs,
      at: made.at,
      tuft: FRAMES.tuft(made.kind),
      count: feel.madeTufts,
      power: feel.madeTuftPower,
    }),
    spawns({ what: "shake", atMs, px: madeShakePx(made.making.what, feel) }),
    ...sets(id, atMs + feel.madeStareMs, { raise: 0 }),
    facing(id, atMs + feel.madeStareMs, restingFace(piece)),
    ...(piece.what === "frizzball" ? frizzballMade(made, atMs, feel) : []),
  ];
}

/** Returns the parts of the board dimming and everyone on it staring as a frizzball is made. */
function frizzballMade(
  made: Made,
  atMs: number,
  feel: FeelTuning,
): readonly Part[] {
  const stareMs = atMs + feel.frizzballMadeStareMs;
  return [
    {
      what: "dim",
      key: { atMs, ms: 0, to: feel.frizzballMadeDim, easing: "linear" },
    },
    {
      what: "dim",
      key: {
        atMs: atMs + feel.frizzballMadeDimWaitMs,
        ms: feel.frizzballMadeDimMs,
        to: 0,
        easing: "in",
      },
    },
    ...made.onlookers.flatMap(({ piece, at }) => [
      facing(piece.id, atMs, "eep"),
      ...sets(piece.id, atMs, {
        lookX: Math.sign(made.at.x - at.x) * feel.frizzballMadeLook,
        lookY: Math.sign(made.at.y - at.y) * feel.frizzballMadeLook,
      }),
      facing(piece.id, stareMs, restingFace(piece)),
      ...sets(piece.id, stareMs, { lookX: 0, lookY: 0 }),
    ]),
  ];
}
