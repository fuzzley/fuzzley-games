import { isSameSuitRun } from "@/engine/tableau/rules";
import { ZoneSpec } from "@/engine/tableau/zone";
import { STOCK_PILE_ID } from "../common/pile_ids";
import {
  CLOSED_STOCK_PLACEHOLDER,
  columnRow,
  foundationRow,
  stockZone,
} from "../common/zone_presets";
import { SpiderRole, spiderPlacementRule } from "./spider_rules";

/** The number of tableau columns. */
export const TABLEAU_COUNT = 10;

/** The number of completed runs a full game produces: eight, from two decks. */
export const FOUNDATION_COUNT = 8;

export { STOCK_PILE_ID };

/**
 * The nineteen zones of a Spider board.
 *
 * The stock sits alone at the left of the top row with the eight foundations
 * filling the right of it, and ten columns run along the bottom. Ten columns is
 * a third board width, and the design size falls out of the grid as it did for
 * the other two.
 */
export function spiderZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = [
  stockZone({
    id: STOCK_PILE_ID,
    role: SpiderRole.STOCK,
    column: 0,
    row: 0,
    accept: spiderPlacementRule(SpiderRole.STOCK),
    backgroundKey: CLOSED_STOCK_PLACEHOLDER,
  }),
  ...foundationRow({
    count: FOUNDATION_COUNT,
    column: 2,
    row: 0,
    role: SpiderRole.FOUNDATION,
    // Never a drop target: a run arrives here by completing itself, not by
    // being put here.
    accept: spiderPlacementRule(SpiderRole.FOUNDATION),
    grab: { kind: "none" },
    draggable: false,
  }),
  ...columnRow({
    count: TABLEAU_COUNT,
    column: 0,
    row: 1,
    role: SpiderRole.TABLEAU,
    accept: spiderPlacementRule(SpiderRole.TABLEAU),
    // Same-suit descending only. A column builds up mixed easily and then
    // cannot be moved, which is the whole difficulty of the game.
    grab: { kind: "run", adjacent: isSameSuitRun },
  }),
];

/** Re-exported: the roles live with the rules that branch on them. */
export { SpiderRole };
