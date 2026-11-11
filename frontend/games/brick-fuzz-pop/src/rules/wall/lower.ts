import { brickKind, hasTrait } from "../catalog/bricks";
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

/**
 * The field row over the floor's: a brick the level needs standing in it
 * is one step from losing the level, and one in the floor's row loses it
 * as the step that brings it there comes down.
 */
export const DANGER_ROW = 1;

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
  const jumped = lowestNeededRow(grown) >= jumpLine;
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
 * Returns a wall with each brick that regrows, moss, given back a hit up to
 * its full hits, as it grows after each round it survives; or the same
 * wall where none grows.
 */
export function regrow(wall: Wall): Wall {
  if (!wall.bricks.some(grows)) return wall;
  return {
    ...wall,
    bricks: wall.bricks.map((brick) =>
      grows(brick) ? { ...brick, hits: brick.hits + 1 } : brick,
    ),
  };
}

/** Returns whether a cell holds a brick that grows a hit back after the round: moss short of its full hits. */
function grows(brick: Brick | null): brick is Brick {
  return (
    brick !== null && brick.hits < brick.full && hasTrait(brick.kind, "regrows")
  );
}

/** Returns whether a cell holds a brick its level needs broken. */
export function isNeeded(brick: Brick | null): boolean {
  return brick !== null && brickKind(brick.kind).needed;
}

/**
 * Returns the field row the lowest brick a wall's level needs stands in,
 * counted from the floor, or Infinity for a wall that holds none.
 */
export function lowestNeededRow(wall: Wall): number {
  // A wall's cells run up from its lowest row, so the first is the lowest.
  const cell = wall.bricks.findIndex(isNeeded);
  return cell < 0 ? Number.POSITIVE_INFINITY : fieldRowOf(wall, cell);
}

/** Returns how many bricks a wall's level needs stand under a field row. */
export function neededBelow(wall: Wall, row: number): number {
  return wall.bricks.filter(
    (brick, cell) => isNeeded(brick) && fieldRowOf(wall, cell) < row,
  ).length;
}

/** Returns whether a brick a wall's level needs stands in {@link DANGER_ROW} or lower, one step from losing the level. */
export function inDanger(wall: Wall): boolean {
  return lowestNeededRow(wall) <= DANGER_ROW;
}

/** Returns the wall cells of the bricks the level needs that stand in {@link DANGER_ROW} or lower, in order. */
export function dangerCells(wall: Wall): readonly number[] {
  return wall.bricks.flatMap((brick, cell) =>
    isNeeded(brick) && fieldRowOf(wall, cell) <= DANGER_ROW ? [cell] : [],
  );
}
