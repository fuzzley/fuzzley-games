// The order a blast strikes the squares it reaches: nearest first, a step
// at a time from where it goes off, and squares at one step by their
// indices. A gap is passed over, and a square listed twice is struck once,
// at the step it is first listed with.

import { itemAt } from "@fz/core/records";
import type { Board } from "../board/board";
import { type Square, squareOf } from "../board/cells";
import type { Strike } from "../move/record";

/**
 * Returns the squares a blast reaches as it strikes them: each open one
 * once, at the step it is first listed with, nearest first and then by
 * index.
 */
export function nearestFirst(
  board: Pick<Board, "open">,
  listed: readonly Strike[],
): readonly Strike[] {
  const seen = board.open.map(() => false);
  const struck: Strike[] = [];
  for (const strike of listed) {
    if (itemAt(board.open, strike.square) && !itemAt(seen, strike.square)) {
      seen[strike.square] = true;
      struck.push(strike);
    }
  }
  return struck.sort((a, b) => a.step - b.step || a.square - b.square);
}

/**
 * Returns the strikes of a blast going off on a square that reaches the
 * whole board: every open square, at its steps across and down from it,
 * nearest first.
 */
export function wholeBoardStrikes(
  board: Pick<Board, "width" | "open">,
  square: number,
): readonly Strike[] {
  const from = squareOf(square, board.width);
  return nearestFirst(
    board,
    board.open.map((_, each) => ({
      square: each,
      step: stepsApart(squareOf(each, board.width), from),
    })),
  );
}

/** Returns how many steps across and down apart two squares are. */
export function stepsApart(a: Square, b: Square): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
