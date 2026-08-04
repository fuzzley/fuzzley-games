import { ZoneSpec } from "@/engine/tableau/zone";
import { STOCK_PILE_ID } from "../common/pile_ids";
import {
  PLAIN_PLACEHOLDER,
  columnRow,
  foundationRow,
  stockZone,
} from "../common/zone_presets";
import { ScorpionRole, scorpionPlacementRule } from "./scorpion_rules";

/** The number of tableau columns. */
export const TABLEAU_COUNT = 7;

/** The number of completed runs a full game produces: one per suit. */
export const FOUNDATION_COUNT = 4;

export { STOCK_PILE_ID };

/**
 * The twelve zones of a Scorpion board.
 *
 * Klondike's grid with the waste taken out: the stock alone at the left of the
 * top row, four foundations at the right of it, and seven columns along the
 * bottom. Seven columns because Scorpion deals seven, and four foundations
 * because one deck completes four runs.
 */
export function scorpionZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = [
  stockZone({
    id: STOCK_PILE_ID,
    role: ScorpionRole.STOCK,
    column: 0,
    row: 0,
    accept: scorpionPlacementRule(ScorpionRole.STOCK),
    // A plain slot rather than Klondike's and Spider's recycle arrow: this
    // stock deals once and is then finished, so there is nothing to come back.
    backgroundKey: PLAIN_PLACEHOLDER,
  }),
  ...foundationRow({
    // Column 1 and 2 are left clear, which keeps the top row Klondike's shape.
    count: FOUNDATION_COUNT,
    column: 3,
    row: 0,
    role: ScorpionRole.FOUNDATION,
    // Never a drop target: a run arrives here by completing itself, not by
    // being put here.
    accept: scorpionPlacementRule(ScorpionRole.FOUNDATION),
    grab: { kind: "none" },
    draggable: false,
  }),
  ...columnRow({
    count: TABLEAU_COUNT,
    column: 0,
    row: 1,
    role: ScorpionRole.TABLEAU,
    accept: scorpionPlacementRule(ScorpionRole.TABLEAU),
    // The Yukon rule, and the defining feature of the game: any face-up card
    // lifts with everything resting on it, ordered or not. Only the bottom card
    // of the moving stack is checked against the target, so a player shifts a
    // jumble by digging out the one card underneath it that fits.
    grab: { kind: "any-face-up" },
  }),
];

/** Re-exported: the roles live with the rules that branch on them. */
export { ScorpionRole };
