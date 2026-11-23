// A wall game's wall: its bricks, the thirds of the field it comes down
// through, the danger row, and how it comes down after a round. What its
// kinds of brick do, which a level needs broken and how the wall stands
// between rounds, is a game's own, in the WallRules it hands in.

import { COLUMNS, LEAST_DEPTH, MOST_DEPTH, isDepth } from "./field";
import { fieldRowOf } from "./grid";

/** Describes a brick of a wall, of a kind `K` names, as it stands this round. */
export interface Brick<K extends string> {
  readonly kind: K;
  /** Its hits left: 0 for a kind that never breaks, so no hits are ever Infinity. */
  readonly hits: number;
  /** Its hits when whole, which a brick that regrows grows back to. */
  readonly full: number;
  /** Its plated faces, a set of the `FieldFace` bits `rules/grid` names: 0 for a brick with no plate. */
  readonly plates: number;
  /** Its ink, as its game gives it from where it stands: 0 for one with an ink of its kind's own. */
  readonly tint: number;
  /** Its twin's wall cell, such as a portal's, which sinks with it; null for a brick with none. */
  readonly twin: number | null;
}

/**
 * Describes a level's wall, a value each round replaces: its bricks, in the
 * field and waiting over the ceiling, and how far it has come down.
 *
 * The wall knows no depth, so a field that changes depth between rounds
 * leaves it as it is, its distance from the floor kept.
 */
export interface Wall<K extends string> {
  /** Each cell's brick or null, by wall cell: wall row × 9 + column, wall row 0 its lowest. */
  readonly bricks: readonly (Brick<K> | null)[];
  /** How many rows it has. */
  readonly rows: number;
  /** The field row wall row 0 stands in: at the depth or over it, a row waits; at 0 or under, it has reached the floor. */
  readonly lowestRow: number;
}

/** Describes a field's thirds at a depth, in whole rows. */
export interface Thirds {
  readonly depth: number;
  /** How many rows a jump brings the wall down: the top third. */
  readonly jump: number;
  /** The row the jump line runs under, the top third's lowest: what stands below it keeps the wall from jumping. */
  readonly jumpLine: number;
  /** The row a wall's lowest stands in as a level opens, and as a jump lands it. */
  readonly opensOn: number;
}

/**
 * Returns a field's thirds at a depth: a jump is the whole part of
 * (depth − 1) / 3, the rows left over going to the third by the floor, and
 * a level opens as a jump leaves it.
 *
 * It throws for a depth no field has, a whole number from
 * {@link LEAST_DEPTH} to {@link MOST_DEPTH}.
 */
export function thirdsOf(depth: number): Thirds {
  if (!isDepth(depth)) {
    throw new RangeError(
      `A field is a whole number from ${String(LEAST_DEPTH)} to ${String(MOST_DEPTH)} rows deep, not ${String(depth)}.`,
    );
  }
  const jump = Math.floor((depth - 1) / 3);
  return {
    depth,
    jump,
    jumpLine: depth - jump,
    opensOn: depth - 2 * jump,
  };
}

/** Holds what a wall game's kinds of brick say of its wall, which the wall's rules are handed. */
export interface WallRules<K extends string> {
  /** Returns whether a level needs a brick of a kind broken to be cleared. */
  readonly needed: (kind: K) => boolean;
  /** Returns the wall as a round leaves it once it is over, before it comes down, such as with its moss grown back: the same wall where nothing changes. */
  readonly betweenRounds: (wall: Wall<K>) => Wall<K>;
}

/** Describes a wall come down after a round, and what its coming down did. */
export interface LoweredWall<K extends string> {
  /** The wall come down, each brick that sank gone and every other in its cell. */
  readonly wall: Wall<K>;
  /** How many rows it came down: a row, a jump's, or none once the level is cleared. */
  readonly rowsDown: number;
  /** Whether it jumped, which earns the next shot its game's reward for a jump. */
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

/** Returns whether a wall cell holds a brick its level needs broken. */
export function isNeeded<K extends string>(
  brick: Brick<K> | null,
  rules: Pick<WallRules<K>, "needed">,
): boolean {
  return brick !== null && rules.needed(brick.kind);
}

/** Returns whether a wall holds no brick its level needs, in the field or waiting over the ceiling. */
export function isCleared<K extends string>(
  wall: Wall<K>,
  rules: Pick<WallRules<K>, "needed">,
): boolean {
  return !wall.bricks.some((brick) => isNeeded(brick, rules));
}

/**
 * Returns how a wall comes down after a round on a field of a depth, and
 * what its coming down did: it stands as `betweenRounds()` leaves it; it
 * comes down a row, or a jump's once no brick the level needs stands below
 * the jump line; each brick the level doesn't need that reaches the floor's
 * row sinks, a twin with it; and the level is lost if one it needs reaches
 * that row.
 *
 * A cleared level's wall stays where it stands, as it is. It throws for a
 * depth no field has, as {@link thirdsOf} does.
 */
export function lowerWall<K extends string>(
  wall: Wall<K>,
  depth: number,
  rules: WallRules<K>,
): LoweredWall<K> {
  const { jump, jumpLine } = thirdsOf(depth);
  if (isCleared(wall, rules)) {
    return { wall, rowsDown: 0, jumped: false, sunk: [], lost: false };
  }
  const grown = rules.betweenRounds(wall);
  // What the level doesn't need below the jump line doesn't hold the wall
  // back, and rows waiting over the ceiling don't either.
  const jumped = lowestNeededRow(grown, rules) >= jumpLine;
  const rowsDown = jumped ? jump : 1;
  const lowestRow = grown.lowestRow - rowsDown;
  // Wall row r stands in field row lowestRow + r, so the rows up to
  // −lowestRow have reached the floor's.
  const reached = grown.bricks.slice(0, Math.max(0, 1 - lowestRow) * COLUMNS);
  const sinking = new Set<number>();
  reached.forEach((brick, cell) => {
    if (brick !== null && !rules.needed(brick.kind)) {
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
    lost: reached.some((brick) => isNeeded(brick, rules)),
  };
}

/**
 * Returns the field row the lowest brick a wall's level needs stands in,
 * counted from the floor, or Infinity for a wall that holds none.
 */
export function lowestNeededRow<K extends string>(
  wall: Wall<K>,
  rules: Pick<WallRules<K>, "needed">,
): number {
  // A wall's cells run up from its lowest row, so the first is the lowest.
  const cell = wall.bricks.findIndex((brick) => isNeeded(brick, rules));
  return cell < 0 ? Number.POSITIVE_INFINITY : fieldRowOf(wall, cell);
}

/** Returns how many bricks a wall's level needs stand under a field row. */
export function neededBelow<K extends string>(
  wall: Wall<K>,
  row: number,
  rules: Pick<WallRules<K>, "needed">,
): number {
  return wall.bricks.filter(
    (brick, cell) => isNeeded(brick, rules) && fieldRowOf(wall, cell) < row,
  ).length;
}

/** Returns whether a brick a wall's level needs stands in {@link DANGER_ROW} or lower, one step from losing the level. */
export function inDanger<K extends string>(
  wall: Wall<K>,
  rules: Pick<WallRules<K>, "needed">,
): boolean {
  return lowestNeededRow(wall, rules) <= DANGER_ROW;
}

/** Returns the wall cells of the bricks the level needs that stand in {@link DANGER_ROW} or lower, in order. */
export function dangerCells<K extends string>(
  wall: Wall<K>,
  rules: Pick<WallRules<K>, "needed">,
): readonly number[] {
  return wall.bricks.flatMap((brick, cell) =>
    isNeeded(brick, rules) && fieldRowOf(wall, cell) <= DANGER_ROW
      ? [cell]
      : [],
  );
}
