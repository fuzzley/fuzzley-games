import { isOrderedPair } from "@/engine/tableau/rules";
import { ZoneSpec } from "@/engine/tableau/zone";
import { STOCK_PILE_ID } from "../common/pile_ids";
import {
  RECYCLING_STOCK_PLACEHOLDER,
  columnRow,
  foundationRow,
  stockZone,
} from "../common/zone_presets";
import { EasthavenRole, easthavenPlacementRule } from "./easthaven_rules";

/** The number of tableau columns. */
export const TABLEAU_COUNT = 7;

/** The number of suit foundation piles. */
export const FOUNDATION_COUNT = 4;

export { STOCK_PILE_ID };

/**
 * The grid column the leftmost foundation sits in.
 *
 * The stock alone at the left of the top row and the foundations filling the
 * right of it: Scorpion's and Spiderette's arrangement, which is Klondike's grid
 * with the waste taken out.
 */
export const FOUNDATION_COLUMN_OFFSET = TABLEAU_COUNT - FOUNDATION_COUNT;

/** The twelve zones of an Easthaven board. */
export function easthavenZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = [
  stockZone({
    id: STOCK_PILE_ID,
    role: EasthavenRole.STOCK,
    column: 0,
    row: 0,
    // Clickable, so a press deals a row, but nothing is ever lifted from it.
    accept: easthavenPlacementRule(EasthavenRole.STOCK),
    backgroundKey: RECYCLING_STOCK_PLACEHOLDER,
  }),
  ...foundationRow({
    count: FOUNDATION_COUNT,
    column: FOUNDATION_COLUMN_OFFSET,
    row: 0,
    role: EasthavenRole.FOUNDATION,
    // A real drop target, unlike Spider's and Spiderette's: the player puts
    // cards here one at a time.
    accept: easthavenPlacementRule(EasthavenRole.FOUNDATION),
  }),
  ...columnRow({
    count: TABLEAU_COUNT,
    column: 0,
    row: 1,
    role: EasthavenRole.TABLEAU,
    accept: easthavenPlacementRule(EasthavenRole.TABLEAU),
    // An ordered alternating-colour run, which is the same question the build
    // rule asks — so both derive from `isOrderedPair` and cannot drift apart.
    // Stricter than Klondike, which lets a broken pile be dragged as long as
    // its bottom card fits.
    grab: { kind: "run", adjacent: isOrderedPair },
  }),
];

/** Re-exported: the roles live with the rules that branch on them. */
export { EasthavenRole };
