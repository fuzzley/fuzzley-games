import { CELLS, at, colOf, indexAt, rowOf } from "./cells";
import { DIGITS } from "./digits";
import { shuffled } from "./random";

/**
 * Says how to turn a board into another face of the same puzzle: one that
 * keeps its single solution and its level, but looks different.
 *
 * The digits are relabeled, the three bands of rows shuffled and the rows
 * inside each band, the same for the stacks of columns, and the board may
 * be turned over its diagonal: 9! × 6⁴ × 6⁴ × 2, about 1.2 trillion faces.
 */
export interface Transform {
  /** The digit each digit becomes: 1 becomes `digits[0]`. */
  readonly digits: readonly number[];
  /** The row each row of the new board is taken from. */
  readonly rows: readonly number[];
  /** The column each column of the new board is taken from. */
  readonly cols: readonly number[];
  /** Whether rows and columns trade places first. */
  readonly transpose: boolean;
}

/** The transform that changes nothing. */
export const IDENTITY: Transform = {
  digits: DIGITS,
  rows: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  cols: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  transpose: false,
};

/** Returns a transform chosen at random. */
export function randomTransform(random: () => number): Transform {
  return {
    digits: shuffled(DIGITS, random),
    rows: lines(random),
    cols: lines(random),
    transpose: random() < 0.5,
  };
}

/** Returns a board's digits under a transform, 0 staying blank. */
export function transform(
  digits: readonly number[],
  { digits: relabel, rows, cols, transpose }: Transform,
): number[] {
  return Array.from({ length: CELLS }, (_, index) => {
    const row = at(rows, rowOf(index));
    const col = at(cols, colOf(index));
    const digit = at(digits, transpose ? indexAt(col, row) : indexAt(row, col));
    return digit === 0 ? 0 : at(relabel, digit - 1);
  });
}

/**
 * Returns an order of the nine rows, or columns, that keeps each band of
 * three together: the bands shuffled, and the lines inside each.
 */
function lines(random: () => number): number[] {
  return shuffled([0, 1, 2], random).flatMap((band) =>
    shuffled([0, 1, 2], random).map((line) => band * 3 + line),
  );
}
