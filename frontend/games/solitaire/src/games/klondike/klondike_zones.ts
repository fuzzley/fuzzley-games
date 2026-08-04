import { PileLayout } from "@/engine/render/layout/pile_layout";
import { ZoneSpec } from "@/engine/tableau/zone";
import { memoizeZones } from "@/engine/tableau/zone_builder";
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
import { DrawCount } from "./klondike_settings";
import {
  DEFAULT_KLONDIKE_VARIANT,
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
 * The grid column the leftmost foundation sits in.
 *
 * Column 2 is left clear for the waste fan to grow into.
 */
export const FOUNDATION_COLUMN_OFFSET = 3;

/**
 * The arrangement a Klondike pile of the given role uses.
 *
 * @param role The part the pile plays.
 * @param drawCount How many cards a draw turns over, which sets the waste fan.
 */
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

/**
 * The thirteen zones of a Klondike board, for the given draw mode and variant.
 *
 * Everything that varies — the waste fan, the column build rule, the column
 * grab rule, whether cards are hidden — follows those two values, so there are
 * exactly six possible answers and the cache is keyed on both.
 *
 * The variant defaults, so the many callers that only care about the draw mode —
 * the layout, and every spec written before the family grew — say nothing about
 * it and get the original game.
 */
export const klondikeZoneSpecs = memoizeZones(
  (
    drawCount: DrawCount,
    variant: KlondikeVariant = DEFAULT_KLONDIKE_VARIANT,
  ): readonly ZoneSpec[] => [
    stockZone({
      id: STOCK_PILE_ID,
      role: KlondikeRole.STOCK,
      column: 0,
      row: 0,
      // The top card is clickable — that is what draws — but pressing it must
      // not pick it up.
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
      // Klondike itself takes any face-up card, ordered or not: it validates
      // only the bottom card of a moving stack, so a broken run can be dragged
      // as long as that card fits where it lands. Whitehead and Thumb and Pouch
      // take proper runs instead, which the variant table pairs with their
      // build rules.
      grab: klondikeGrabRule(variant),
      // Whitehead hides nothing, so deferring to the card would be the same as
      // always-up — but saying it outright is what makes the deal's own
      // face-up flag and the zone agree by construction.
      face: klondikeDealsFaceUp(variant) ? "always-up" : "card",
    }),
  ],
  (drawCount, variant = DEFAULT_KLONDIKE_VARIANT) => `${drawCount}:${variant}`,
);

/** Re-exported: the roles and variants live with the rules that branch on them. */
export { KlondikeRole, KlondikeVariant };
