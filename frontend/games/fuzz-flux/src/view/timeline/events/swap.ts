// A move's swap, with its sound: the two slide past each other, overshoot
// a little and settle, or, for two specials, the first slides onto the
// second and the pair winds up; a special set off where it stands, after a
// moment's wait; and a swap refused, with its own sound, as the two lean
// at each other, shake their heads and go back.

import type { Swap } from "../../../rules/move/record";
import type { GridShown } from "../../run_state";
import { goesOff } from "../board_after";
import type { FeelTuning } from "../feel";
import { RAISED, restingFace } from "../looks";
import { type Part, cue, facing, moves, sets } from "../part";
import { type Standing, findStanding, standingOn } from "../standing";
import type { Place } from "../timeline";
import { pairWindUp } from "./pair";

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
      cue("refuse", 0),
      ...(from === null || to === null ? [] : refused(from, to, feel)),
      { what: "hold", atMs: feel.refusedOutMs + feel.refusedBackMs },
    ];
  }
  if (swap.from === swap.to) {
    return [{ what: "hold", atMs: feel.setOffWaitMs }];
  }
  const from = standingOn(grid, swap.from);
  const to = standingOn(grid, swap.to);
  const slides: readonly Part[] = [
    ...sets(from.piece.id, 0, { raise: RAISED.moving }),
    ...moves(from.piece.id, 0, feel.swapMs, "back", to.at),
  ];
  return [
    cue("swap", 0),
    ...slides,
    ...(goesOff(from.piece) && goesOff(to.piece)
      ? pairWindUp(from, to, feel.swapMs, feel)
      : moves(to.piece.id, 0, feel.swapMs, "back", from.at)),
    { what: "hold", atMs: feel.swapMs },
  ];
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
