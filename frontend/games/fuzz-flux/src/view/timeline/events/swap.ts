// A move's swap: the two slide past each other, overshoot a little and
// settle, or, for two specials, the first slides onto the second; a
// special set off where it stands, after a moment's wait; and a swap
// refused, as the two lean at each other, shake their heads and go back.

import type { Piece } from "../../../rules/catalog/pieces";
import type { Swap } from "../../../rules/move/record";
import type { GridShown } from "../../run_state";
import type { FeelTuning } from "../feel";
import { RAISED, restingFace } from "../looks";
import { type Part, facing, moves, sets } from "../part";
import { type Standing, findStanding, standingOn } from "../standing";
import type { Place } from "../timeline";

/**
 * Returns the parts of a move's swap on the board as it stands at the tap,
 * holding the board until the swap is done; none for a special refused
 * where it stands, which plays nothing.
 *
 * @throws {RangeError} for a swap kept from or to a square with no piece.
 */
export function swapOf(
  swap: Swap,
  grid: GridShown,
  feel: FeelTuning,
): readonly Part[] {
  if (swap.refused && swap.from === swap.to) {
    return [];
  }
  if (swap.refused) {
    const from = findStanding(grid, swap.from);
    const to = findStanding(grid, swap.to);
    return [
      ...(from === null || to === null ? [] : refused(from, to, feel)),
      { what: "hold", atMs: feel.refusedOutMs + feel.refusedBackMs },
    ];
  }
  return swap.from === swap.to
    ? [{ what: "hold", atMs: feel.setOffWaitMs }]
    : [
        ...swapped(
          standingOn(grid, swap.from),
          standingOn(grid, swap.to),
          feel,
        ),
        { what: "hold", atMs: feel.swapMs },
      ];
}

/**
 * Returns the parts of a swap kept: the piece swapped from slides, raised,
 * to the other's square, and the other slides to its square; where both
 * go off, as two specials do, the other stays.
 */
function swapped(
  from: Standing,
  to: Standing,
  feel: FeelTuning,
): readonly Part[] {
  return [
    ...sets(from.piece.id, 0, { raise: RAISED.moving }),
    ...moves(from.piece.id, 0, feel.swapMs, "back", to.at),
    ...(goesOff(from.piece) && goesOff(to.piece)
      ? []
      : moves(to.piece.id, 0, feel.swapMs, "back", from.at)),
  ];
}

/** Returns whether a piece is a special or the frizzball, which goes off as it is swapped. */
function goesOff(piece: Piece): boolean {
  return (
    piece.what === "frizzball" ||
    (piece.what === "fuzzball" && piece.special !== null)
  );
}

/**
 * Returns the parts of a swap refused: each of the two but a brick, which
 * never moves, looks cross, leans out toward the other and springs back,
 * shaking its head as it goes.
 */
function refused(
  from: Standing,
  to: Standing,
  feel: FeelTuning,
): readonly Part[] {
  return [...leanOut(from, to.at, feel), ...leanOut(to, from.at, feel)];
}

/** Returns the parts of a piece of a swap refused leaning out toward another's place and back, none for a brick. */
function leanOut(
  { piece, at }: Standing,
  toward: Place,
  feel: FeelTuning,
): readonly Part[] {
  if (piece.what === "brick") {
    return [];
  }
  const id = piece.id;
  return [
    facing(id, 0, "cross"),
    ...moves(id, 0, feel.refusedOutMs, "out", {
      leanX: (toward.x - at.x) * feel.refusedReach,
      leanY: (toward.y - at.y) * feel.refusedReach,
    }),
    ...moves(id, feel.refusedOutMs, feel.refusedBackMs, "spring", {
      leanX: 0,
      leanY: 0,
    }),
    ...sets(id, 0, { wobble: feel.refusedWobble }),
    ...moves(id, 0, feel.refusedOutMs + feel.refusedBackMs, "out", {
      wobble: 0,
    }),
    facing(id, feel.refusedCrossMs, restingFace(piece)),
  ];
}
