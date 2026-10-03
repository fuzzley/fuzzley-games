import { suitFoundation } from "@/engine/tableau/rules";
import { ZoneSpec } from "@/engine/tableau/zone";
import { zoneRow } from "@/engine/tableau/zone_builder";
import {
  OPEN_COLUMN_LAYOUT,
  STACKED_PILE_LAYOUT,
} from "../common/pile_layouts";
import { columnRow, foundationRow } from "../common/zone_presets";
import { BED_RULE, FlowerGardenRole } from "./flower_garden_rules";

/** The number of beds. */
export const BED_COUNT = 6;

/** The number of cards in the bouquet: whatever the beds leave over. */
export const BOUQUET_SIZE = 16;

/**
 * How many grid columns the bouquet fans across, from the left edge of its
 * first card to the left edge of its last.
 *
 * Four leaves each card about 67 design units of its left edge in view, more
 * than the 55 a waste fan shows of each card's index corner.
 */
export const BOUQUET_SPAN = 4;

/** The grid column the first foundation sits in, right of the bouquet. */
export const FOUNDATION_COLUMN_OFFSET = BOUQUET_SPAN + 1;

/** How many grid columns the board is wide. */
export const BOARD_COLUMN_COUNT = FOUNDATION_COLUMN_OFFSET + 4;

/** The grid column the first bed sits in, centring the beds on the board. */
export const BED_COLUMN_OFFSET = (BOARD_COLUMN_COUNT - BED_COUNT) / 2;

/** Returns the stable id of the bouquet card at the given index. */
export function bouquetPileId(index: number): string {
  return `bouquet-${index}`;
}

/**
 * Returns the zones of a Flower Garden board: the bouquet fanned along the top
 * left, the foundations at the top right, and the beds beneath.
 *
 * The bouquet is a pile per card, laid out at fractional columns so the cards
 * overlap like a hand of cards. Each is the top of its own pile, so every one
 * is free to play without a grab rule that reaches into the middle of a pile,
 * and a later pile draws over an earlier one.
 */
export function flowerGardenZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = [
  ...zoneRow({
    count: BOUQUET_SIZE,
    id: bouquetPileId,
    column: (index) => (index * BOUQUET_SPAN) / (BOUQUET_SIZE - 1),
    row: 0,
    role: FlowerGardenRole.BOUQUET,
    // Cards only leave the bouquet.
    accept: null,
    layout: STACKED_PILE_LAYOUT,
    grab: { kind: "top-only" },
    draggable: true,
    face: "always-up",
    // Over bare table, so a played card leaves a gap in the hand.
  }),
  ...foundationRow({
    count: 4,
    column: FOUNDATION_COLUMN_OFFSET,
    row: 0,
    role: FlowerGardenRole.FOUNDATION,
    accept: suitFoundation,
  }),
  ...columnRow({
    count: BED_COUNT,
    column: BED_COLUMN_OFFSET,
    row: 1,
    role: FlowerGardenRole.BED,
    accept: BED_RULE,
    grab: { kind: "top-only" },
    layout: OPEN_COLUMN_LAYOUT,
    face: "always-up",
  }),
];

/** Re-exported: the roles live with the rules that branch on them. */
export { FlowerGardenRole };
