/** Says what one square holds: a digit, or 0, and a set of notes. */
export interface Square {
  readonly digit: number;
  readonly notes: number;
}

/** Says how a move changed one square. */
export interface Change {
  readonly index: number;
  readonly before: Square;
  readonly after: Square;
}

/** Lists the squares one move changed, which undo takes back together. */
export type Move = readonly Change[];
