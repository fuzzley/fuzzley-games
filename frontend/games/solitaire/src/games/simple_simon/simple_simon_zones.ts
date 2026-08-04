import { isSameSuitRun } from "@/engine/tableau/rules";
import { ZoneSpec } from "@/engine/tableau/zone";
import { OPEN_COLUMN_LAYOUT } from "../common/pile_layouts";
import { columnRow, foundationRow } from "../common/zone_presets";
import { SimpleSimonRole, simpleSimonPlacementRule } from "./simple_simon_rules";

/** The number of tableau columns. */
export const TABLEAU_COUNT = 10;

/** The number of completed runs a full game produces: four, from one deck. */
export const FOUNDATION_COUNT = 4;

/**
 * The grid column the leftmost foundation sits in.
 *
 * The four foundations sit at the right of the top row, leaving the left of it
 * bare. There is no stock to put there — which is the point of the game, and
 * looks like it.
 */
export const FOUNDATION_COLUMN_OFFSET = TABLEAU_COUNT - FOUNDATION_COUNT;

/** The fourteen zones of a Simple Simon board. */
export function simpleSimonZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = [
  ...foundationRow({
    count: FOUNDATION_COUNT,
    column: FOUNDATION_COLUMN_OFFSET,
    row: 0,
    role: SimpleSimonRole.FOUNDATION,
    // Never a drop target: a run arrives here by completing itself, not by
    // being put here, and taking one back apart is not a move.
    accept: simpleSimonPlacementRule(SimpleSimonRole.FOUNDATION),
    grab: { kind: "none" },
    draggable: false,
  }),
  ...columnRow({
    count: TABLEAU_COUNT,
    column: 0,
    row: 1,
    role: SimpleSimonRole.TABLEAU,
    accept: simpleSimonPlacementRule(SimpleSimonRole.TABLEAU),
    // Same-suit descending only, which is the same question the build rule
    // does *not* ask — a column takes any descending card and gives up only a
    // single suit. Both halves derive from the shared predicates, so neither
    // can drift from what the other expects.
    grab: { kind: "run", adjacent: isSameSuitRun },
    // Every card is dealt face up, so there is nothing to turn over.
    layout: OPEN_COLUMN_LAYOUT,
    face: "always-up",
  }),
];

/** Re-exported: the roles live with the rules that branch on them. */
export { SimpleSimonRole };
