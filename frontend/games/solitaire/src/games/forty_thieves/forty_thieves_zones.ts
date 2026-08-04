import { PileLayout } from "@/engine/render/layout/pile_layout";
import { ZoneSpec } from "@/engine/tableau/zone";
import { memoizeZones } from "@/engine/tableau/zone_builder";
import { STOCK_PILE_ID, WASTE_PILE_ID } from "../common/pile_ids";
import {
  PLAIN_PLACEHOLDER,
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
  fortyThievesPlacementRule,
  fortyThievesTableauCount,
} from "./forty_thieves_rules";

/**
 * The number of foundations: eight, two per suit, because the game is dealt
 * from two decks.
 */
export const FOUNDATION_COUNT = 8;

export { STOCK_PILE_ID, WASTE_PILE_ID };

/**
 * The grid column the leftmost foundation sits in.
 *
 * Stock, waste, then eight foundations — which this game can pack together
 * because it draws one card at a time, so its waste never fans and needs no
 * clear column beside it the way Klondike's does.
 */
export const FOUNDATION_COLUMN_OFFSET = 2;

/**
 * How many slots the top row needs: the stock, the waste and every foundation.
 *
 * The floor under every board in the family. Maria deals only nine columns but
 * still has to seat ten across the top, so its board is wider than its tableau —
 * the same trade Eight Off makes for its eight cells.
 */
export const TOP_ROW_SLOT_COUNT = FOUNDATION_COLUMN_OFFSET + FOUNDATION_COUNT;

/** How many grid columns a variant's board is wide. */
export function boardColumnCount(variant: FortyThievesVariant): number {
  return Math.max(fortyThievesTableauCount(variant), TOP_ROW_SLOT_COUNT);
}

/**
 * The grid column the leftmost tableau column sits in.
 *
 * Zero for every variant whose tableau is at least as wide as the top row, and
 * a centring nudge for Maria, whose nine columns sit under ten slots. Derived
 * rather than written out so it stays right if the counts ever change.
 */
export function tableauColumnOffset(variant: FortyThievesVariant): number {
  return Math.floor(
    (boardColumnCount(variant) - fortyThievesTableauCount(variant)) / 2,
  );
}

/**
 * How the waste arranges its cards: one at a time.
 *
 * A draw turns a single card, so there is never more than one to show and
 * fanning would only leave a gap where the second card is not — the same
 * reasoning Klondike applies to its own Draw 1 mode.
 */
export const WASTE_PILE_LAYOUT: PileLayout = {
  kind: "fan-right",
  gap: 0,
  maxVisible: 1,
};

/**
 * The zones of a Forty Thieves board, for the given variant.
 *
 * Everything that varies — the column count, the build rule, the grab rule,
 * whether cards are dealt face down — follows the variant, so there are exactly
 * as many possible answers as there are variants.
 */
export const fortyThievesZoneSpecs = memoizeZones(
  (variant: FortyThievesVariant): readonly ZoneSpec[] => [
    stockZone({
      id: STOCK_PILE_ID,
      role: FortyThievesRole.STOCK,
      column: 0,
      row: 0,
      // The top card is clickable — that is what draws — but pressing it must
      // not pick it up.
      accept: fortyThievesPlacementRule(FortyThievesRole.STOCK, variant),
      // Deliberately not the reset placeholder Klondike and Spider use, and
      // deliberately no `emptyIsActionable`: there is no recycle in this
      // family, so an emptied stock is spent for good and should not invite a
      // press that does nothing.
      backgroundKey: PLAIN_PLACEHOLDER,
    }),
    wasteZone({
      id: WASTE_PILE_ID,
      role: FortyThievesRole.WASTE,
      column: 1,
      row: 0,
      accept: fortyThievesPlacementRule(FortyThievesRole.WASTE, variant),
      layout: WASTE_PILE_LAYOUT,
    }),
    ...foundationRow({
      count: FOUNDATION_COUNT,
      column: FOUNDATION_COLUMN_OFFSET,
      row: 0,
      role: FortyThievesRole.FOUNDATION,
      accept: fortyThievesPlacementRule(FortyThievesRole.FOUNDATION, variant),
    }),
    ...columnRow({
      count: fortyThievesTableauCount(variant),
      column: tableauColumnOffset(variant),
      row: 1,
      role: FortyThievesRole.TABLEAU,
      accept: fortyThievesPlacementRule(FortyThievesRole.TABLEAU, variant),
      grab: fortyThievesGrabRule(variant),
      // Only Rank and File buries anything; the other two show every card from
      // the deal, so deferring to the card would be the same as always-up.
      face: fortyThievesHidesCards(variant) ? "card" : "always-up",
    }),
  ],
);

/** Re-exported: the roles live with the rules that branch on them. */
export { FortyThievesRole };
