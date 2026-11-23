// What the panels beside a wide room's field show of a wall: the rows
// waiting over the ceiling, and the kinds of brick it holds.

import { COLUMNS } from "../../rules/field";
import { cellOf } from "../../rules/grid";
import type { Brick, Wall } from "../../rules/wall";

/**
 * Returns the rows of a wall waiting over the ceiling of a field a depth
 * deep, as the field stacks them: the furthest first and the next to come
 * in last, each its bricks from the left, null where there is none.
 */
export function waitingRows<K extends string>(
  wall: Wall<K>,
  depth: number,
): readonly (readonly (Brick<K> | null)[])[] {
  // The lowest wall row over the ceiling, which stands in field row `depth`.
  const lowest = Math.max(0, depth - wall.lowestRow);
  return Array.from({ length: Math.max(0, wall.rows - lowest) }, (_, i) => {
    const row = wall.rows - 1 - i;
    return Array.from(
      { length: COLUMNS },
      (_, column) => wall.bricks[cellOf(column, row)] ?? null,
    );
  });
}

/** Returns the kinds of brick a wall holds, in the field or waiting over it, in the order a game lists its kinds in. */
export function kindsIn<K extends string>(
  wall: Wall<K>,
  order: readonly K[],
): readonly K[] {
  const kinds = new Set(wall.bricks.map((brick) => brick?.kind));
  return order.filter((kind) => kinds.has(kind));
}
