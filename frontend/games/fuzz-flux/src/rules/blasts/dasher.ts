// The squares a dasher strikes going off: every square of the line it
// runs along, across its row or down its column, from itself outward.

import { itemAt } from "@fz/core/records";
import type { Board } from "../board/board";
import { columnsOf, rowsOf, squareOf } from "../board/cells";
import type { SpecialId } from "../catalog/specials";
import type { Strike } from "../move/record";
import { nearestFirst, stepsApart } from "./strikes";

/** A dasher, by the way it runs in the board's own frame. */
type Dasher = Extract<SpecialId, "dasher-across" | "dasher-down">;

/**
 * Returns the squares a dasher going off on a square strikes: each square
 * of its row, for a dasher across, or of its column, for one down, a step
 * a square out from it.
 */
export function dasherStrikes(
  board: Pick<Board, "width" | "height" | "open">,
  dasher: Dasher,
  square: number,
): readonly Strike[] {
  const from = squareOf(square, board.width);
  const line =
    dasher === "dasher-across"
      ? itemAt(rowsOf(board), from.y)
      : itemAt(columnsOf(board), from.x);
  return nearestFirst(
    board,
    line.map((each) => ({
      square: each,
      step: stepsApart(squareOf(each, board.width), from),
    })),
  );
}
