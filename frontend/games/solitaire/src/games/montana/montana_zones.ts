import { ZoneSpec } from "@/engine/tableau/zones/zone";
import { zoneAt } from "@/engine/tableau/zones/zone_builder";
import { STACKED_PILE_LAYOUT } from "../common/pile_layouts";
import {
  PLAIN_PLACEHOLDER,
  recyclePipsPlaceholder,
} from "../common/zone_presets";
import {
  DEFAULT_MAX_REDEALS,
  DEFAULT_MONTANA_VARIANT,
  MaxRedeals,
  MontanaRole,
  MontanaVariant,
  ROW_COUNT,
  montanaCellRule,
  montanaColumnCount,
  montanaFirstColumnFixed,
  montanaFirstRank,
} from "./montana_rules";

/** The stable id of the redeal marker. */
export const REDEAL_PILE_ID = "redeal";

/**
 * Returns how many grid columns the board of `variant` is wide: the grid's
 * own plus one for the redeal marker beside it.
 */
export function boardColumnCount(variant: MontanaVariant): number {
  return montanaColumnCount(variant) + 1;
}

/** Returns the stable id of the cell at the given row and column. */
export function cellPileId(row: number, column: number): string {
  return `cell-${row}-${column}`;
}

/**
 * Returns the zones of a board of `variant` allowing `maxRedeals` redeals: the
 * grid's cells, row by row, then the redeal marker.
 *
 * Built cell by cell because each cell's rule depends on its left neighbour.
 */
export function montanaZoneSpecs(
  variant: MontanaVariant = DEFAULT_MONTANA_VARIANT,
  maxRedeals: MaxRedeals = DEFAULT_MAX_REDEALS,
): readonly ZoneSpec[] {
  const zones: ZoneSpec[] = [];
  const columnCount = montanaColumnCount(variant);
  const firstRank = montanaFirstRank(variant);
  const firstColumnFixed = montanaFirstColumnFixed(variant);

  for (let row = 0; row < ROW_COUNT; row++) {
    for (let column = 0; column < columnCount; column++) {
      // The Moons' Aces head their rows for good: nothing lands there and
      // nothing leaves.
      const fixed = firstColumnFixed && column === 0;
      zones.push(
        zoneAt({
          id: cellPileId(row, column),
          role: MontanaRole.CELL,
          column,
          row,
          layout: STACKED_PILE_LAYOUT,
          capacity: 1,
          // The neighbour is captured here, where both cells are in hand,
          // rather than parsed out of an id at rule time.
          accept: fixed
            ? null
            : montanaCellRule(
                column === 0 ? null : cellPileId(row, column - 1),
                firstRank,
              ),
          grab: fixed ? { kind: "none" } : { kind: "top-only" },
          draggable: !fixed,
          face: "always-up",
          backgroundKey: PLAIN_PLACEHOLDER,
        }),
      );
    }
  }

  zones.push(
    zoneAt({
      id: REDEAL_PILE_ID,
      role: MontanaRole.REDEAL,
      // Beside the grid rather than in it, on the row a player's eye starts at.
      column: columnCount,
      row: 0,
      layout: STACKED_PILE_LAYOUT,
      // Never a destination and never a source: it is a button that happens to
      // be drawn on the table.
      accept: null,
      grab: { kind: "none" },
      draggable: false,
      face: "always-down",
      // How it starts out; the game redraws it as redeals are spent.
      backgroundKey: recyclePipsPlaceholder(maxRedeals, maxRedeals),
      // Pressing the empty slot is the whole point of it.
      emptyIsActionable: true,
    }),
  );

  return zones;
}

/** Re-exported: the roles and variants live with the rules that shape them. */
export { MontanaRole, MontanaVariant };
