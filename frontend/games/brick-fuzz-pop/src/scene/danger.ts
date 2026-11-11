import { cellAt } from "../rules/grid";
import { COLUMNS } from "../rules/tuning";
import { isNeeded } from "../rules/wall/lower";
import type { Wall } from "../rules/wall/wall";

/**
 * The field row over the floor's, along whose foot the danger line runs: a
 * brick the level needs standing in it is one step from losing the level.
 */
export const DANGER_ROW = 1;

/**
 * Returns whether a brick the level needs stands in a field row and column,
 * which, at or under the row over the floor's, endangers the level: one
 * step from losing it, or, in the floor's row, as the step that loses it
 * comes down.
 */
export function endangers(wall: Wall, column: number, row: number): boolean {
  return isNeeded(wall.bricks[cellAt(wall, column, row)] ?? null);
}

/** Returns whether a brick the level needs stands at or under the row over the floor's. */
export function inDanger(wall: Wall): boolean {
  for (let row = 0; row <= DANGER_ROW; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      if (endangers(wall, column, row)) return true;
    }
  }
  return false;
}
