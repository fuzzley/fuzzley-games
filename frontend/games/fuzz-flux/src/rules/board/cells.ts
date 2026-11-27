// The squares of a board. The rules know a square by its index, y * width
// + x, in the board's own frame: x across from the left, y down from the
// top. Pictures, words and the view know it by its column and row.

import type { Board } from "./board";

/** Describes a square by its column, x, from the left, and its row, y, from the top. */
export interface Square {
  readonly x: number;
  readonly y: number;
}

/** Describes a board's size, which is all its squares' neighbors and lines ask of it. */
export type BoardSize = Pick<Board, "width" | "height">;

/**
 * The steps to a square's neighbors, in the order the rules visit them:
 * right, left, down and up. What a bunch strikes beside it, and where a
 * burr can spread, are taken in this order.
 */
const STEPS: readonly Square[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

/** Returns a square's index on a board so many squares wide. */
export function indexOf({ x, y }: Square, width: number): number {
  return y * width + x;
}

/** Returns the square at an index of a board so many squares wide. */
export function squareOf(index: number, width: number): Square {
  const x = index % width;
  return { x, y: (index - x) / width };
}

/** Returns the squares beside a square that are on its board, right, left, down and up. */
export function neighborsOf(
  square: number,
  board: BoardSize,
): readonly number[] {
  const { x, y } = squareOf(square, board.width);
  return STEPS.flatMap((step) => {
    const beside = { x: x + step.x, y: y + step.y };
    return isOnBoard(beside, board) ? [indexOf(beside, board.width)] : [];
  });
}

/** Returns the squares of each row of a board, from the top, each row's from the left. */
export function rowsOf({
  width,
  height,
}: BoardSize): readonly (readonly number[])[] {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => indexOf({ x, y }, width)),
  );
}

/** Returns the squares of each column of a board, from the left, each column's from the top. */
export function columnsOf({
  width,
  height,
}: BoardSize): readonly (readonly number[])[] {
  return Array.from({ length: width }, (_, x) =>
    Array.from({ length: height }, (_, y) => indexOf({ x, y }, width)),
  );
}

/** Returns whether a square, by its column and row, is on a board. */
export function isOnBoard(
  { x, y }: Square,
  { width, height }: BoardSize,
): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
}
