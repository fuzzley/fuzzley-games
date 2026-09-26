import { PileLayout } from "@/engine/render/layout/pile_layout";
import { ZoneSpec } from "@/engine/tableau/zone";
import { STOCK_PILE_ID, WASTE_PILE_ID } from "../common/pile_ids";
import {
  BURIED_COLUMN_LAYOUT,
  STACKED_PILE_LAYOUT,
  wasteFanLayout,
} from "../common/pile_layouts";
import {
  RECYCLING_STOCK_PLACEHOLDER,
  columnRow,
  foundationRow,
  stockZone,
  wasteZone,
} from "../common/zone_presets";
import {
  DEFAULT_KLONDIKE_VARIANT,
  DrawCount,
  KlondikeRole,
  KlondikeVariant,
  klondikeDealsFaceUp,
  klondikeGrabRule,
  klondikePlacementRule,
} from "./klondike_rules";

/** The number of suit foundation piles in a standard Klondike game. */
export const FOUNDATION_COUNT = 4;

/** The number of tableau columns in a standard Klondike game. */
export const TABLEAU_COUNT = 7;

export { STOCK_PILE_ID, WASTE_PILE_ID };

/**
 * The grid column the leftmost foundation sits in, leaving column 2 clear for
 * the waste fan.
 */
export const FOUNDATION_COLUMN_OFFSET = 3;

/** Returns a Klondike pile's layout for its role and the draw count. */
export function klondikePileLayout(
  role: string,
  drawCount: number,
): PileLayout {
  switch (role) {
    case KlondikeRole.TABLEAU:
      return BURIED_COLUMN_LAYOUT;
    case KlondikeRole.WASTE:
      return wasteFanLayout(drawCount);
    default:
      return STACKED_PILE_LAYOUT;
  }
}

/** Returns the thirteen zones of a Klondike board. */
export function klondikeZoneSpecs(
  drawCount: DrawCount,
  variant: KlondikeVariant = DEFAULT_KLONDIKE_VARIANT,
): readonly ZoneSpec[] {
  return [
    stockZone({
      id: STOCK_PILE_ID,
      role: KlondikeRole.STOCK,
      column: 0,
      row: 0,
      accept: klondikePlacementRule(KlondikeRole.STOCK),
      backgroundKey: RECYCLING_STOCK_PLACEHOLDER,
      // Clicking the empty slot recycles the waste.
      emptyIsActionable: true,
    }),
    wasteZone({
      id: WASTE_PILE_ID,
      role: KlondikeRole.WASTE,
      column: 1,
      row: 0,
      accept: klondikePlacementRule(KlondikeRole.WASTE),
      layout: wasteFanLayout(drawCount),
    }),
    ...foundationRow({
      count: FOUNDATION_COUNT,
      column: FOUNDATION_COLUMN_OFFSET,
      row: 0,
      role: KlondikeRole.FOUNDATION,
      accept: klondikePlacementRule(KlondikeRole.FOUNDATION),
    }),
    ...columnRow({
      count: TABLEAU_COUNT,
      column: 0,
      row: 1,
      role: KlondikeRole.TABLEAU,
      accept: klondikePlacementRule(KlondikeRole.TABLEAU, variant),
      grab: klondikeGrabRule(variant),
      // Read from the same flag as the deal, so the two agree by construction.
      face: klondikeDealsFaceUp(variant) ? "always-up" : "card",
    }),
  ];
}

/** Re-exported: the roles and variants live with the rules that branch on them. */
export { KlondikeRole, KlondikeVariant };
