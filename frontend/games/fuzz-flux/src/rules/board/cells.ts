// The squares of a board. The rules know a square by its index, y * width
// + x, in the board's own frame: x across from the left, y down from the
// top. Pictures, words and the view know it by its column and row.

/** Describes a square by its column, x, from the left, and its row, y, from the top. */
export interface Square {
  readonly x: number;
  readonly y: number;
}

/** Returns a square's index on a board so many squares wide. */
export function indexOf({ x, y }: Square, width: number): number {
  return y * width + x;
}

/** Returns the square at an index of a board so many squares wide. */
export function squareOf(index: number, width: number): Square {
  const x = index % width;
  return { x, y: (index - x) / width };
}
