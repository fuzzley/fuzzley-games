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
 * The grid column the leftmost foundation sits in, leaving column 2 clear for
 * the waste fan.
 */
export const FOUNDATION_COLUMN_OFFSET = 3;

/**
 * How many grid columns the board is wide, set by the eleven slots of the top
 * row rather than the nine columns below it.
 */
export const BOARD_COLUMN_COUNT = FOUNDATION_COLUMN_OFFSET + FOUNDATION_COUNT;

/**
 * The grid column the leftmost tableau column sits in, centring the columns
 * under the top row.
 */
export const TABLEAU_COLUMN_OFFSET = Math.floor(
  (BOARD_COLUMN_COUNT - TABLEAU_COUNT) / 2,
);

/** Returns the nineteen zones of a Double Klondike board. */
export function doubleKlondikeZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = [
  stockZone({
    id: STOCK_PILE_ID,
    role: DoubleKlondikeRole.STOCK,
    column: 0,
    row: 0,
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
    // Klondike's deliberately lax rule, so the two play alike.
    grab: { kind: "any-face-up" },
  }),
];

/** Re-exported: the roles live with the rules that branch on them. */
export { DoubleKlondikeRole };
