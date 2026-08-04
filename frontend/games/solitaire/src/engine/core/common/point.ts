/**
 * Represents a 2D point on the board.
 *
 * Readonly, as every other geometry type in the engine is: a point is handed
 * out by the layout maths in arrays a caller iterates, and nothing has cause to
 * write through one.
 */
export interface Point {
  readonly x: number;
  readonly y: number;
}
