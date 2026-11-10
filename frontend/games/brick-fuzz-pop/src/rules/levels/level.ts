import type { RoundStart } from "../round/round";
import type { Boon } from "../shot";
import { FIRST_X } from "../tuning";
import { type Brick, thirdsOf } from "../wall/wall";

/** Describes a level, ready to play. */
export interface Level {
  /** The boon each jump of its wall earns the next shot. */
  readonly boon: Boon;
  /** Its wall's bricks, by wall cell: wall row × 9 + column, wall row 0 its lowest; null where none. */
  readonly bricks: readonly (Brick | null)[];
  /** How many rows its wall has. */
  readonly rows: number;
}

/**
 * Returns where a level's first round starts on a field of a depth: its
 * wall's lowest row where a jump would land it, the fuzzball waiting at the
 * floor's middle, with no friend freed and no boon.
 *
 * It throws for a depth no field has, as {@link thirdsOf} does.
 */
export function levelStart(level: Level, depth: number): RoundStart {
  return {
    wall: {
      bricks: level.bricks,
      rows: level.rows,
      lowestRow: thirdsOf(depth).opensOn,
    },
    depth,
    x: FIRST_X,
    crew: { friends: [] },
    boon: null,
  };
}
