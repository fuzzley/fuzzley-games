import type { BrickKindId } from "../catalog/bricks";
import { LEAST_DEPTH, MOST_DEPTH } from "../tuning";

/** Describes a brick of a wall, as it stands this round. */
export interface Brick {
  readonly kind: BrickKindId;
  /** Its hits left: 0 for a kind that never breaks, which has the trait "never", so no hits are ever Infinity. */
  readonly hits: number;
  /** Its hits when whole, which moss grows back to. */
  readonly full: number;
  /** Its plated faces, a set of the `FieldFace` bits `src/rules/grid.ts` names: 0 for a brick with no plate. */
  readonly plates: number;
  /**
   * Its ink, 0 to 7: its row's for a plain or tough brick; for a portal, its
   * pair's mark, 0 for a wall's first pair and 1 for its second; else 0, as
   * every other kind keeps an ink of its own.
   */
  readonly tint: number;
  /** A portal's twin, as a wall cell; null for any other brick. */
  readonly twin: number | null;
}

/**
 * Describes a level's wall, a value each round replaces: its bricks, in the
 * field and waiting over the ceiling, and how far it has come down.
 *
 * The wall knows no depth, so a field that changes depth between rounds
 * leaves it as it is, its distance from the floor kept.
 */
export interface Wall {
  /** Each cell's brick or null, by wall cell: wall row × 9 + column, wall row 0 its lowest. */
  readonly bricks: readonly (Brick | null)[];
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

/** Every depth a field has, from 11 rows to 22. */
export const DEPTHS: readonly number[] = Array.from(
  { length: MOST_DEPTH - LEAST_DEPTH + 1 },
  (_, index) => LEAST_DEPTH + index,
);

/** Returns whether a value is a depth a field has: a whole number of rows from 11 to 22. */
export function isDepth(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= LEAST_DEPTH &&
    value <= MOST_DEPTH
  );
}

/**
 * Returns a field's thirds at a depth: a jump is the whole part of
 * (depth − 1) / 3, the rows left over going to the third by the floor, and
 * a level opens as a jump leaves it.
 *
 * It throws for a depth no field has, a whole number from 11 to 22.
 */
export function thirdsOf(depth: number): Thirds {
  if (!isDepth(depth)) {
    throw new RangeError(
      `A field is a whole number from ${LEAST_DEPTH} to ${MOST_DEPTH} rows deep, not ${String(depth)}.`,
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
