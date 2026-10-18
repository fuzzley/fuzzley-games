import { PileLayout } from "@/engine/render/layout/pile_layout";
import { ZoneSpec } from "@/engine/tableau/zones/zone";
import { STOCK_PILE_ID, WASTE_PILE_ID } from "../common/pile_ids";
import {
  CLOSED_STOCK_PLACEHOLDER,
  columnRow,
  foundationRow,
  stockZone,
  wasteZone,
} from "../common/zone_presets";
import {
  FortyThievesRole,
  FortyThievesVariant,
  fortyThievesGrabRule,
  fortyThievesHidesCards,
  fortyThievesTableauCount,
  FORTY_THIEVES_FOUNDATION_RULE,
  fortyThievesTableauRule,
} from "./forty_thieves_rules";

/**
 * The number of foundations: eight, two per suit, because the game is dealt
 * from two decks.
 */
export const FOUNDATION_COUNT = 8;

export { STOCK_PILE_ID, WASTE_PILE_ID };

/**
 * The grid column the leftmost foundation sits in, right beside the waste,
 * which never fans.
 */
export const FOUNDATION_COLUMN_OFFSET = 2;

/** How many slots the top row needs: stock, waste and every foundation. */
export const TOP_ROW_SLOT_COUNT = FOUNDATION_COLUMN_OFFSET + FOUNDATION_COUNT;

/** Returns how many grid columns a variant's board is wide. */
export function boardColumnCount(variant: FortyThievesVariant): number {
  return Math.max(fortyThievesTableauCount(variant), TOP_ROW_SLOT_COUNT);
}

/**
 * Returns the grid column the leftmost tableau column sits in, centring a
 * tableau narrower than the top row.
 */
export function tableauColumnOffset(variant: FortyThievesVariant): number {
  return Math.floor(
    (boardColumnCount(variant) - fortyThievesTableauCount(variant)) / 2,
  );
}

/** How the waste arranges its cards: only the top one shows. */
export const WASTE_PILE_LAYOUT: PileLayout = {
  kind: "spread",
  direction: "right",
  gap: 0,
  maxVisible: 1,
};

/** Returns the zones of a Forty Thieves board under a variant. */
export function fortyThievesZoneSpecs(
  variant: FortyThievesVariant,
): readonly ZoneSpec[] {
  return [
    stockZone({
      id: STOCK_PILE_ID,
      role: FortyThievesRole.STOCK,
      column: 0,
      row: 0,
      accept: null,
      // No `emptyIsActionable`: the stock is never recycled.
      backgroundKey: CLOSED_STOCK_PLACEHOLDER,
    }),
    wasteZone({
      id: WASTE_PILE_ID,
      role: FortyThievesRole.WASTE,
      column: 1,
      row: 0,
      accept: null,
      layout: WASTE_PILE_LAYOUT,
    }),
    ...foundationRow({
      count: FOUNDATION_COUNT,
      column: FOUNDATION_COLUMN_OFFSET,
      row: 0,
      role: FortyThievesRole.FOUNDATION,
      accept: FORTY_THIEVES_FOUNDATION_RULE,
    }),
    ...columnRow({
      count: fortyThievesTableauCount(variant),
      column: tableauColumnOffset(variant),
      row: 1,
      role: FortyThievesRole.TABLEAU,
      accept: fortyThievesTableauRule(variant),
      grab: fortyThievesGrabRule(variant),
      face: fortyThievesHidesCards(variant) ? "card" : "always-up",
    }),
  ];
}

/** Re-exported: the roles live with the rules that use them. */
export { FortyThievesRole };
