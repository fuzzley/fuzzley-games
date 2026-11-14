import type { BrickKindId } from "../catalog/bricks";
import type { CapsuleId } from "../catalog/capsules";

/** How many tints a brick may take. */
export const TINTS = 8;

/** The layout a level is in where its data names none, as a level never redrawn is. */
export const FIRST_LAYOUT = 1;

/** Describes a brick as a level lays it out. */
export interface LevelBrick {
  readonly kind: BrickKindId;
  /** The hits it takes to break, 0 for one that never breaks. */
  readonly hits: number;
  /** Its tint, from 0 to 7. */
  readonly tint: number;
  /** The capsule a gift brick gives, where the level pins one, else null. */
  readonly capsule: CapsuleId | null;
}

/** Describes a level, ready to play. */
export interface Level {
  /** The number of the layout its bricks are in, from 1, which a redraw raises. */
  readonly layout: number;
  /** Its bricks, a cell for each of the grid's, row by row, null where none. */
  readonly cells: readonly (LevelBrick | null)[];
  /** The ball's speed against the speed's own. */
  readonly pace: number;
  /** The chance a brick the level needs lets a capsule fall as it breaks. */
  readonly drops: number;
  /** The capsules that can fall in it. */
  readonly capsules: readonly CapsuleId[];
}
