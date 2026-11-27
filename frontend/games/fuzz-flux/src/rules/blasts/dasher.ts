// The squares a dasher strikes going off, alone or swapped with another
// dasher or a puffer: every square of each line it runs along, across a
// row or down a column, from the square it goes off on outward.

import type { Board } from "../board/board";
import { type Square, columnsOf, rowsOf, squareOf } from "../board/cells";
import type { BlastId } from "../catalog/specials";
import type { Strike } from "../move/record";
import { DASHER_AND_PUFFER_SPREAD } from "../tuning";
import { nearestFirst } from "./strikes";

/** Describes a line a dasher's blast runs along: a row or a column, so many lines on from the one it goes off on. */
interface Line {
  readonly way: "across" | "down";
  readonly offset: number;
}

/** Each line, so many either side of a dasher and a puffer's own, across and then down. */
const SPREAD_LINES: readonly Line[] = Array.from(
  { length: 2 * DASHER_AND_PUFFER_SPREAD + 1 },
  (_, place) => place - DASHER_AND_PUFFER_SPREAD,
).flatMap((offset) => [
  { way: "across", offset },
  { way: "down", offset },
]);

/** The lines each blast that dashes runs along, in the order it runs them. */
const LINES = {
  "dasher-across": [{ way: "across", offset: 0 }],
  "dasher-down": [{ way: "down", offset: 0 }],
  "two-dashers": [
    { way: "across", offset: 0 },
    { way: "down", offset: 0 },
  ],
  "dasher-and-puffer": SPREAD_LINES,
} as const satisfies Readonly<Partial<Record<BlastId, readonly Line[]>>>;

/**
 * Returns the squares a blast that dashes, going off on a square, strikes:
 * each square of the lines it runs along, a step a square out along its
 * line from the line it crosses there, and a square two lines share at
 * the step the first line run gives it.
 */
export function dasherStrikes(
  board: Pick<Board, "width" | "height" | "open">,
  what: keyof typeof LINES,
  square: number,
): readonly Strike[] {
  const from = squareOf(square, board.width);
  const lines: readonly Line[] = LINES[what];
  return nearestFirst(
    board,
    lines.flatMap((line) => along(board, line, from)),
  );
}

/** Returns the squares of a line, each at its step along it from where the blast goes off, none for a line past the board's edge. */
function along(
  board: Pick<Board, "width" | "height">,
  { way, offset }: Line,
  from: Square,
): readonly Strike[] {
  const across = way === "across";
  const lines = across ? rowsOf(board) : columnsOf(board);
  const line = lines[(across ? from.y : from.x) + offset] ?? [];
  return line.map((square) => {
    const { x, y } = squareOf(square, board.width);
    return {
      square,
      step: across ? Math.abs(x - from.x) : Math.abs(y - from.y),
    };
  });
}
