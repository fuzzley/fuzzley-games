import { type Direction, type Square, stepFrom } from "./geometry";

/** How many squares the board has across, and down. */
export const BOARD_SIZE = 17;

/** Returns whether a square lies on a board of a size. */
export function onBoard(square: Square, size: number): boolean {
  return square.x >= 0 && square.y >= 0 && square.x < size && square.y < size;
}

/**
 * Returns the square a step from a square lands on, or null where it runs
 * into the wall around the board.
 */
export function landing(
  square: Square,
  direction: Direction,
  size: number,
): Square | null {
  const next = stepFrom(square, direction);
  return onBoard(next, size) ? next : null;
}
