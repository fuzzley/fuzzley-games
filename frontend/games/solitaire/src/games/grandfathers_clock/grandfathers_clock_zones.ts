import {
  CARD_HEIGHT_PX,
  CARD_WIDTH_PX,
  LAYOUT_GAP_X,
  LAYOUT_GAP_Y,
} from "@/engine/render/layout/card_metrics";
import { ZoneSpec } from "@/engine/tableau/zone";
import { zoneAt } from "@/engine/tableau/zone_builder";
import { foundationPileId } from "../common/pile_ids";
import {
  OPEN_COLUMN_LAYOUT,
  STACKED_PILE_LAYOUT,
} from "../common/pile_layouts";
import { FOUNDATION_PLACEHOLDER, columnRow } from "../common/zone_presets";
import {
  CLOCK_FOUNDATION_RULE,
  CLOCK_TABLEAU_RULE,
  ClockRole,
  DIAL,
} from "./grandfathers_clock_rules";

/** The number of columns. */
export const TABLEAU_COUNT = 8;

/**
 * The dial's radius, from its centre to the centre of each card, in design
 * units: wide enough that neighbouring cards only overlap at their corners.
 */
export const DIAL_RADIUS = 500;

/** How far apart grid columns are, in design units. */
const COLUMN_PITCH = CARD_WIDTH_PX + LAYOUT_GAP_X;

/** How far apart grid rows are, in design units. */
const ROW_PITCH = CARD_HEIGHT_PX + LAYOUT_GAP_Y;

/** How many grid rows the dial is tall. */
export const DIAL_ROWS = (2 * DIAL_RADIUS + CARD_HEIGHT_PX) / ROW_PITCH;

/** The grid column the first column sits in, just right of the dial. */
export const TABLEAU_COLUMN_OFFSET = Math.ceil(
  (2 * DIAL_RADIUS + CARD_WIDTH_PX) / COLUMN_PITCH,
);

/** How many grid columns the board is wide: the dial, then the columns. */
export const BOARD_COLUMN_COUNT = TABLEAU_COLUMN_OFFSET + TABLEAU_COUNT;

/** Returns the stable id of the foundation at the given hour. */
export function hourPileId(hour: number): string {
  return foundationPileId(hour);
}

/**
 * Returns where the card at an hour sits on the grid: on a circle, measured
 * in design units and converted to fractional grid columns and rows, with the
 * nine o'clock card at column 0 and the twelve o'clock card at row 0.
 */
export function dialSlot(hour: number): { column: number; row: number } {
  const angle = (hour % 12) * (Math.PI / 6);
  return {
    column: (DIAL_RADIUS + DIAL_RADIUS * Math.sin(angle)) / COLUMN_PITCH,
    row: (DIAL_RADIUS - DIAL_RADIUS * Math.cos(angle)) / ROW_PITCH,
  };
}

/**
 * Returns the zones of a Grandfather's Clock board: the dial's twelve
 * foundations, then the eight columns beside it.
 *
 * The dial is declared from the top down, so where two cards overlap the lower
 * one draws over the bottom of the higher, and every card's index stays in
 * view.
 */
export function grandfathersClockZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = [
  ...[...DIAL]
    .sort((a, b) => dialSlot(a.hour).row - dialSlot(b.hour).row)
    .map(({ hour, capacity }) =>
      zoneAt({
        id: hourPileId(hour),
        role: ClockRole.FOUNDATION,
        ...dialSlot(hour),
        accept: CLOCK_FOUNDATION_RULE,
        capacity,
        layout: STACKED_PILE_LAYOUT,
        // A card built is built for good.
        grab: { kind: "none" },
        draggable: false,
        face: "always-up",
        backgroundKey: FOUNDATION_PLACEHOLDER,
      }),
    ),
  ...columnRow({
    count: TABLEAU_COUNT,
    column: TABLEAU_COLUMN_OFFSET,
    row: 0,
    role: ClockRole.TABLEAU,
    accept: CLOCK_TABLEAU_RULE,
    grab: { kind: "top-only" },
    layout: OPEN_COLUMN_LAYOUT,
    face: "always-up",
  }),
];

/** Re-exported: the roles live with the rules that branch on them. */
export { ClockRole };
