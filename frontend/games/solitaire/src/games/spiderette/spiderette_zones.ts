import { PileLayout } from "@/engine/render/layout/pile_layout";
import { isSameSuitRun } from "@/engine/tableau/rules";
import { ZoneSpec } from "@/engine/tableau/zone";
import { SpideretteRole, spiderettePlacementRule } from "./spiderette_rules";

/** The number of tableau columns. */
export const TABLEAU_COUNT = 7;

/** The number of completed runs a full game produces: one per suit. */
export const FOUNDATION_COUNT = 4;

/** The stable id of the single stock pile. */
export const STOCK_PILE_ID = "stock";

/**
 * The grid column the leftmost foundation sits in.
 *
 * The stock sits alone at the left of the top row and the foundations fill the
 * right of it, leaving column 1 and 2 clear — Scorpion's arrangement, and
 * Klondike's grid with the waste taken out, which is what a seven-column game
 * with no draw comes to.
 */
export const FOUNDATION_COLUMN_OFFSET = TABLEAU_COUNT - FOUNDATION_COUNT;

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

/** How a Spiderette column arranges its cards. */
export const TABLEAU_PILE_LAYOUT: PileLayout = {
  kind: "fan-down",
  faceUpGap: TABLEAU_FACE_UP_OFFSET,
  faceDownGap: TABLEAU_FACE_DOWN_OFFSET,
  hoverExpansion: TABLEAU_HOVER_EXPANSION_OFFSET,
};

/** How the stock and the foundations arrange their cards: squarely. */
export const STACKED_PILE_LAYOUT: PileLayout = { kind: "stacked" };

/**
 * The twelve zones of a Spiderette board.
 *
 * The same for both variants: they differ in how the cards are dealt onto this
 * board, not in the board itself, which is why the zones take no variant.
 */
export function spideretteZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = buildZoneSpecs();

function buildZoneSpecs(): readonly ZoneSpec[] {
  const zones: ZoneSpec[] = [
    {
      id: STOCK_PILE_ID,
      role: SpideretteRole.STOCK,
      slot: { pileId: STOCK_PILE_ID, column: 0, row: 0 },
      layout: STACKED_PILE_LAYOUT,
      accept: spiderettePlacementRule(SpideretteRole.STOCK),
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
      role: SpideretteRole.FOUNDATION,
      slot: { pileId: id, column: FOUNDATION_COLUMN_OFFSET + index, row: 0 },
      layout: STACKED_PILE_LAYOUT,
      // Never a drop target: a run arrives here by completing itself.
      accept: spiderettePlacementRule(SpideretteRole.FOUNDATION),
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
      role: SpideretteRole.TABLEAU,
      slot: { pileId: id, column: index, row: 1 },
      layout: TABLEAU_PILE_LAYOUT,
      accept: spiderettePlacementRule(SpideretteRole.TABLEAU),
      // Same-suit descending only, as Spider's is: a column takes any
      // descending card and gives up only a single suit.
      grab: { kind: "run", adjacent: isSameSuitRun },
      draggable: true,
      face: "card",
      backgroundKey: "card-placeholder",
    });
  }

  return zones;
}

/** Re-exported: the roles live with the rules that branch on them. */
export { SpideretteRole };
