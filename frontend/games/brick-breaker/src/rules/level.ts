import type { BrickKindId } from "./catalog/bricks";

/** Describes a brick as a level lays it out. */
export interface LevelBrick {
  readonly kind: BrickKindId;
  /** The hits it takes to break, 0 for one that never breaks. */
  readonly hits: number;
  /** Its tint, from 0 to 7. */
  readonly tint: number;
}

/** Describes a level, ready to play. */
export interface Level {
  /** Its bricks, a cell for each of the grid's, row by row, null where none. */
  readonly cells: readonly (LevelBrick | null)[];
  /** The ball's speed against the speed's own. */
  readonly pace: number;
}
