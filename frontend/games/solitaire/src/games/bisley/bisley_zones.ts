import { ALL_SUITS } from "@/engine/core/card/playing_card";
import { ZoneSpec } from "@/engine/tableau/zones/zone";
import { zoneAt } from "@/engine/tableau/zones/zone_builder";
import { foundationPileId } from "../common/pile_ids";
import {
  OPEN_COLUMN_LAYOUT,
  STACKED_PILE_LAYOUT,
} from "../common/pile_layouts";
import { FOUNDATION_PLACEHOLDER, columnRow } from "../common/zone_presets";
import {
  BISLEY_TABLEAU_RULE,
  BisleyRole,
  aceFoundationRule,
  kingFoundationRule,
} from "./bisley_rules";

/** The number of tableau columns. */
export const TABLEAU_COUNT = 13;

/**
 * The grid column the leftmost King foundation sits in, so the four of them
 * end the top row as the Aces start it.
 */
export const KING_FOUNDATION_COLUMN_OFFSET = TABLEAU_COUNT - ALL_SUITS.length;

/** Returns the stable id of the King foundation at the given index. */
export function kingFoundationPileId(index: number): string {
  return `king-foundation-${index}`;
}

/**
 * Returns the twenty-one zones of a Bisley board: the Ace foundations, the
 * King foundations, then the columns.
 *
 * The foundations are built one by one because each closes over a suit, in
 * {@link ALL_SUITS} order, which is the order the deal lays the Aces in.
 */
export function bisleyZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

/** Returns a foundation of either kind, the same but for its id and rule. */
function foundationZone(
  id: string,
  column: number,
  accept: ZoneSpec["accept"],
): ZoneSpec {
  return zoneAt({
    id,
    role: BisleyRole.FOUNDATION,
    column,
    row: 0,
    accept,
    layout: STACKED_PILE_LAYOUT,
    grab: { kind: "top-only" },
    draggable: true,
    face: "always-up",
    backgroundKey: FOUNDATION_PLACEHOLDER,
  });
}

const ZONES: readonly ZoneSpec[] = [
  ...ALL_SUITS.map((suit, index) =>
    foundationZone(foundationPileId(index), index, aceFoundationRule(suit)),
  ),
  ...ALL_SUITS.map((suit, index) =>
    foundationZone(
      kingFoundationPileId(index),
      KING_FOUNDATION_COLUMN_OFFSET + index,
      kingFoundationRule(suit),
    ),
  ),
  ...columnRow({
    count: TABLEAU_COUNT,
    column: 0,
    row: 1,
    role: BisleyRole.TABLEAU,
    accept: BISLEY_TABLEAU_RULE,
    // One card at a time: with no cells and no refillable columns, nothing
    // could stage a run.
    grab: { kind: "top-only" },
    layout: OPEN_COLUMN_LAYOUT,
    face: "always-up",
  }),
];

/** Re-exported: the roles live with the rules that use them. */
export { BisleyRole };
