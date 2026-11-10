import { brickKind } from "../catalog/bricks";
import { fieldRowOf } from "../grid";
import { COLUMNS } from "../tuning";
import { type Brick, type Wall, thirdsOf } from "./wall";

/** Describes a wall come down after a round, and what its coming down did. */
export interface LoweredWall {
  /** The wall come down, each brick that sank gone and every other in its cell. */
  readonly wall: Wall;
  /** How many rows it came down: a row, a jump's, or none once the level is cleared. */
  readonly rowsDown: number;
  /** Whether it jumped, which earns the next shot the level's boon. */
  readonly jumped: boolean;
  /** The wall cells of the bricks that sank into the floor, by cell. */
  readonly sunk: readonly number[];
  /** Whether a brick the level needs reached the floor's row, which loses the level. */
  readonly lost: boolean;
}

/** Returns whether a wall holds no brick its level needs, in the field or waiting over the ceiling. */
export function isCleared(wall: Wall): boolean {
  return !wall.bricks.some(isNeeded);
}

/**
 * Returns how a wall comes down after a round on a field of a depth, and
 * what its coming down did: its moss grows back a hit; it comes down a row,
 * or a jump's rows once no brick the level needs stands below the jump
 * line; each brick the level doesn't need that reaches the floor's row
 * sinks, a portal with its twin; and the level is lost if one it needs
 * reaches that row.
 *
 * A cleared level's wall stays where it stands, as it is. It throws for a
 * depth no field has, as {@link thirdsOf} does.
 */
export function lowerWall(wall: Wall, depth: number): LoweredWall {
  const { jump, jumpLine } = thirdsOf(depth);
  if (isCleared(wall)) {
    return { wall, rowsDown: 0, jumped: false, sunk: [], lost: false };
  }
  const grown = regrow(wall);
  // Steel, bumpers and portals below the jump line don't hold the wall
  // back, and rows waiting over the ceiling don't either.
  const lowest = grown.bricks.findIndex(isNeeded);
  const jumped = fieldRowOf(grown, lowest) >= jumpLine;
  const rowsDown = jumped ? jump : 1;
  const lowestRow = grown.lowestRow - rowsDown;
  // Wall row r stands in field row lowestRow + r, so the rows up to
  // −lowestRow have reached the floor's.
  const reached = grown.bricks.slice(0, Math.max(0, 1 - lowestRow) * COLUMNS);
  const sinking = new Set<number>();
  reached.forEach((brick, cell) => {
    if (brick !== null && !isNeeded(brick)) {
      sinking.add(cell);
      if (brick.twin !== null) {
        sinking.add(brick.twin);
      }
    }
  });
  return {
    wall: {
      bricks: grown.bricks.map((brick, cell) =>
        sinking.has(cell) ? null : brick,
      ),
      rows: grown.rows,
      lowestRow,
    },
    rowsDown,
    jumped,
    sunk: [...sinking].sort((a, b) => a - b),
    lost: reached.some(isNeeded),
  };
}

/**
 * Returns a wall with each brick that regrows given back a hit, up to its
 * full hits, as moss grows after each round it survives.
 *
 * It returns the wall as it is until Thick walls catalogs moss, the one
 * kind that regrows: {@link lowerWall} calls it before the wall comes down,
 * so moss needs only this filled in.
 */
export function regrow(wall: Wall): Wall {
  return wall;
}

/** Returns whether a cell holds a brick its level needs broken. */
function isNeeded(brick: Brick | null): boolean {
  return brick !== null && brickKind(brick.kind).needed;
}
