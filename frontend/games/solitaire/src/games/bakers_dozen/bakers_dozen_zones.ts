import { ZoneSpec } from "@/engine/tableau/zone";
import { OPEN_COLUMN_LAYOUT } from "../common/pile_layouts";
import { columnRow, foundationRow } from "../common/zone_presets";
import {
  BakersDozenRole,
  bakersDozenPlacementRule,
} from "./bakers_dozen_rules";

/** The number of tableau columns. Thirteen, which is the name of the game. */
export const TABLEAU_COUNT = 13;

/** The number of suit foundation piles. */
export const FOUNDATION_COUNT = 4;

/**
 * The grid column the leftmost foundation sits in.
 *
 * The foundations sit at the right of the top row, as Simple Simon's do and for
 * the same reason: there is no stock to occupy the left of it.
 */
export const FOUNDATION_COLUMN_OFFSET = TABLEAU_COUNT - FOUNDATION_COUNT;

/** The seventeen zones of a Baker's Dozen board. */
export function bakersDozenZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = [
  ...foundationRow({
    count: FOUNDATION_COUNT,
    column: FOUNDATION_COLUMN_OFFSET,
    row: 0,
    role: BakersDozenRole.FOUNDATION,
    accept: bakersDozenPlacementRule(BakersDozenRole.FOUNDATION),
  }),
  ...columnRow({
    count: TABLEAU_COUNT,
    column: 0,
    row: 1,
    role: BakersDozenRole.TABLEAU,
    accept: bakersDozenPlacementRule(BakersDozenRole.TABLEAU),
    // One card at a time. There is nowhere to stage a run — no cells, and no
    // empty column will ever take one — so a multi-card move could not be
    // carried out by any sequence of legal single moves.
    grab: { kind: "top-only" },
    // Every card is dealt face up, so nothing is ever turned over.
    layout: OPEN_COLUMN_LAYOUT,
    face: "always-up",
  }),
];

/** Re-exported: the roles live with the rules that branch on them. */
export { BakersDozenRole };
