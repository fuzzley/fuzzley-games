import { isSameSuitRun } from "@/engine/tableau/rules";
import { ZoneSpec } from "@/engine/tableau/zone";
import { STOCK_PILE_ID } from "../common/pile_ids";
import {
  CLOSED_STOCK_PLACEHOLDER,
  columnRow,
  foundationRow,
  stockZone,
} from "../common/zone_presets";
import { SpideretteRole, spiderettePlacementRule } from "./spiderette_rules";

/** The number of tableau columns. */
export const TABLEAU_COUNT = 7;

/** The number of completed runs a full game produces: one per suit. */
export const FOUNDATION_COUNT = 4;

export { STOCK_PILE_ID };

/**
 * The grid column the leftmost foundation sits in.
 *
 * The stock sits alone at the left of the top row and the foundations fill the
 * right of it, leaving column 1 and 2 clear — Scorpion's arrangement, and
 * Klondike's grid with the waste taken out, which is what a seven-column game
 * with no draw comes to.
 */
export const FOUNDATION_COLUMN_OFFSET = TABLEAU_COUNT - FOUNDATION_COUNT;

/**
 * The twelve zones of a Spiderette board.
 *
 * The same for both variants: they differ in how the cards are dealt onto this
 * board, not in the board itself, which is why the zones take no variant.
 */
export function spideretteZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = [
  stockZone({
    id: STOCK_PILE_ID,
    role: SpideretteRole.STOCK,
    column: 0,
    row: 0,
    accept: spiderettePlacementRule(SpideretteRole.STOCK),
    backgroundKey: CLOSED_STOCK_PLACEHOLDER,
  }),
  ...foundationRow({
    count: FOUNDATION_COUNT,
    column: FOUNDATION_COLUMN_OFFSET,
    row: 0,
    role: SpideretteRole.FOUNDATION,
    // Never a drop target: a run arrives here by completing itself.
    accept: spiderettePlacementRule(SpideretteRole.FOUNDATION),
    grab: { kind: "none" },
    draggable: false,
  }),
  ...columnRow({
    count: TABLEAU_COUNT,
    column: 0,
    row: 1,
    role: SpideretteRole.TABLEAU,
    accept: spiderettePlacementRule(SpideretteRole.TABLEAU),
    // Same-suit descending only, as Spider's is: a column takes any descending
    // card and gives up only a single suit.
    grab: { kind: "run", adjacent: isSameSuitRun },
  }),
];

/** Re-exported: the roles live with the rules that branch on them. */
export { SpideretteRole };
