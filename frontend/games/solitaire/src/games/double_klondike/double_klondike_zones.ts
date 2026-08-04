import { ZoneSpec } from "@/engine/tableau/zone";
import { STOCK_PILE_ID, WASTE_PILE_ID } from "../common/pile_ids";
import { wasteFanLayout } from "../common/pile_layouts";
import {
  RECYCLING_STOCK_PLACEHOLDER,
  columnRow,
  foundationRow,
  stockZone,
  wasteZone,
} from "../common/zone_presets";
import {
  DoubleKlondikeRole,
  doubleKlondikePlacementRule,
} from "./double_klondike_rules";

/** The number of tableau columns. */
export const TABLEAU_COUNT = 9;

/**
 * The number of foundations: eight, two per suit, because the game is dealt
 * from two decks.
 */
export const FOUNDATION_COUNT = 8;

export { STOCK_PILE_ID, WASTE_PILE_ID };

/**
 * The grid column the leftmost foundation sits in.
 *
 * Stock at 0, waste at 1, and column 2 left clear for the waste fan to grow
 * into — exactly as Klondike arranges its own top row, and for the same reason:
 * a draw of three fans rightwards and would otherwise run into the first
 * foundation.
 */
export const FOUNDATION_COLUMN_OFFSET = 3;

/**
 * How many grid columns the board is wide.
 *
 * The top row binds, as it does in Eight Off and Maria: stock, waste, a clear
 * column and eight foundations need eleven slots, while only nine columns hang
 * beneath them.
 */
export const BOARD_COLUMN_COUNT = FOUNDATION_COLUMN_OFFSET + FOUNDATION_COUNT;

/**
 * The grid column the leftmost tableau column sits in.
 *
 * Derived rather than written as `1`, so it stays centred if the counts above
 * ever change.
 */
export const TABLEAU_COLUMN_OFFSET = Math.floor(
  (BOARD_COLUMN_COUNT - TABLEAU_COUNT) / 2,
);

/** The nineteen zones of a Double Klondike board. */
export function doubleKlondikeZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = [
  stockZone({
    id: STOCK_PILE_ID,
    role: DoubleKlondikeRole.STOCK,
    column: 0,
    row: 0,
    // The top card is clickable — that is what draws — but pressing it must not
    // pick it up.
    accept: doubleKlondikePlacementRule(DoubleKlondikeRole.STOCK),
    backgroundKey: RECYCLING_STOCK_PLACEHOLDER,
    // Clicking the empty slot recycles the waste, as in Klondike.
    emptyIsActionable: true,
  }),
  wasteZone({
    id: WASTE_PILE_ID,
    role: DoubleKlondikeRole.WASTE,
    column: 1,
    row: 0,
    accept: doubleKlondikePlacementRule(DoubleKlondikeRole.WASTE),
    // The last three fanned rightwards, as Klondike fans its own.
    layout: wasteFanLayout(3),
  }),
  ...foundationRow({
    count: FOUNDATION_COUNT,
    column: FOUNDATION_COLUMN_OFFSET,
    row: 0,
    role: DoubleKlondikeRole.FOUNDATION,
    accept: doubleKlondikePlacementRule(DoubleKlondikeRole.FOUNDATION),
  }),
  ...columnRow({
    count: TABLEAU_COUNT,
    column: TABLEAU_COLUMN_OFFSET,
    row: 1,
    role: DoubleKlondikeRole.TABLEAU,
    accept: doubleKlondikePlacementRule(DoubleKlondikeRole.TABLEAU),
    // Any face-up card, ordered or not — Klondike's deliberately lax rule, kept
    // here so the two play the same way.
    grab: { kind: "any-face-up" },
  }),
];

/** Re-exported: the roles live with the rules that branch on them. */
export { DoubleKlondikeRole };
