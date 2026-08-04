import { ZoneSpec } from "@/engine/tableau/zone";
import { memoizeZones } from "@/engine/tableau/zone_builder";
import { OPEN_COLUMN_LAYOUT } from "../common/pile_layouts";
import { cellRow, columnRow, foundationRow } from "../common/zone_presets";
import {
  FreeCellRole,
  FreeCellVariant,
  freeCellPlacementRule,
  freeCellRunAdjacency,
} from "./freecell_rules";

/** The number of free cells. */
export const CELL_COUNT = 4;

/** The number of suit foundation piles. */
export const FOUNDATION_COUNT = 4;

/** The number of tableau columns. */
export const TABLEAU_COUNT = 8;

/**
 * The sixteen zones of a FreeCell board, under the given rule set.
 *
 * Free cells at the left of the top row, foundations at the right of it, and
 * the eight columns filling the bottom row. Unlike Klondike there is no stock
 * and no waste at all, which is most of why FreeCell is worth building: nothing
 * in the engine may assume a game has either. The board is the same shape in
 * every variant; only what the columns accept and give up differs.
 *
 * Memoized per variant, and that matters beyond saving sixteen allocations:
 * `TableGame.zoneFor` rebuilds its id index whenever the zone array is a
 * different array, so returning a fresh one per call would rebuild the index
 * once per card per frame. There are three variants, so the cache is bounded
 * and cannot go stale.
 */
export const freeCellZoneSpecs = memoizeZones(
  (variant: FreeCellVariant): readonly ZoneSpec[] => [
    ...cellRow({
      count: CELL_COUNT,
      column: 0,
      row: 0,
      role: FreeCellRole.CELL,
      accept: freeCellPlacementRule(FreeCellRole.CELL, variant),
    }),
    ...foundationRow({
      count: FOUNDATION_COUNT,
      column: CELL_COUNT,
      row: 0,
      role: FreeCellRole.FOUNDATION,
      accept: freeCellPlacementRule(FreeCellRole.FOUNDATION, variant),
    }),
    ...columnRow({
      count: TABLEAU_COUNT,
      column: 0,
      row: 1,
      role: FreeCellRole.TABLEAU,
      accept: freeCellPlacementRule(FreeCellRole.TABLEAU, variant),
      // Only a properly ordered run may be lifted, ordered by whatever the
      // variant builds by. Klondike is laxer; FreeCell is not, because a column
      // has no face-down cards to hide a broken one.
      grab: { kind: "run", adjacent: freeCellRunAdjacency(variant) },
      layout: OPEN_COLUMN_LAYOUT,
      face: "always-up",
    }),
  ],
);

/** Re-exported: the roles and variants live with the rules that branch on them. */
export { FreeCellRole, FreeCellVariant };
