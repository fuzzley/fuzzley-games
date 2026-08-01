import { PileLayout } from "@/engine/render/layout/pile_layout";
import { isSameSuitRun } from "@/engine/tableau/rules";
import { ZoneSpec } from "@/engine/tableau/zone";
import { SpiderRole, spiderPlacementRule } from "./spider_rules";

/** The number of tableau columns. */
export const TABLEAU_COUNT = 10;

/** The number of completed runs a full game produces: eight, from two decks. */
export const FOUNDATION_COUNT = 8;

/** The stable id of the single stock pile. */
export const STOCK_PILE_ID = "stock";

/** The stable id of the foundation at the given index. */
export function foundationPileId(index: number): string {
  return `foundation-${index}`;
}

/** The stable id of the tableau column at the given index. */
export function tableauPileId(index: number): string {
  return `tableau-${index}`;
}

/** Downward gap below a face-up column card before the next one. */
export const TABLEAU_FACE_UP_OFFSET = 45;

/** Downward gap below a face-down column card before the next one. */
export const TABLEAU_FACE_DOWN_OFFSET = 18;

/** Extra downward gap opened below the hovered card. */
export const TABLEAU_HOVER_EXPANSION_OFFSET = 15;

/** How a Spider column arranges its cards. */
export const TABLEAU_PILE_LAYOUT: PileLayout = {
  kind: "fan-down",
  faceUpGap: TABLEAU_FACE_UP_OFFSET,
  faceDownGap: TABLEAU_FACE_DOWN_OFFSET,
  hoverExpansion: TABLEAU_HOVER_EXPANSION_OFFSET,
};

/** How the stock and the foundations arrange their cards: squarely. */
export const STACKED_PILE_LAYOUT: PileLayout = { kind: "stacked" };

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

const ZONES: readonly ZoneSpec[] = buildZoneSpecs();

function buildZoneSpecs(): readonly ZoneSpec[] {
  const zones: ZoneSpec[] = [
    {
      id: STOCK_PILE_ID,
      role: SpiderRole.STOCK,
      slot: { pileId: STOCK_PILE_ID, column: 0, row: 0 },
      layout: STACKED_PILE_LAYOUT,
      accept: spiderPlacementRule(SpiderRole.STOCK),
      // Clickable, so a press deals a row, but nothing is ever lifted from it.
      grab: { kind: "top-only" },
      draggable: false,
      face: "always-down",
      backgroundKey: "card-placeholder-full-border-reset",
    },
  ];

  for (let index = 0; index < FOUNDATION_COUNT; index++) {
    const id = foundationPileId(index);
    zones.push({
      id,
      role: SpiderRole.FOUNDATION,
      slot: { pileId: id, column: 2 + index, row: 0 },
      layout: STACKED_PILE_LAYOUT,
      // Never a drop target: a run arrives here by completing itself, not by
      // being put here.
      accept: spiderPlacementRule(SpiderRole.FOUNDATION),
      grab: { kind: "none" },
      draggable: false,
      face: "always-up",
      backgroundKey: "card-placeholder-full-border-circle",
    });
  }

  for (let index = 0; index < TABLEAU_COUNT; index++) {
    const id = tableauPileId(index);
    zones.push({
      id,
      role: SpiderRole.TABLEAU,
      slot: { pileId: id, column: index, row: 1 },
      layout: TABLEAU_PILE_LAYOUT,
      accept: spiderPlacementRule(SpiderRole.TABLEAU),
      // Same-suit descending only. A column builds up mixed easily and then
      // cannot be moved, which is the whole difficulty of the game.
      grab: { kind: "run", adjacent: isSameSuitRun },
      draggable: true,
      face: "card",
      backgroundKey: "card-placeholder",
    });
  }

  return zones;
}

/** Re-exported: the roles live with the rules that branch on them. */
export { SpiderRole };
