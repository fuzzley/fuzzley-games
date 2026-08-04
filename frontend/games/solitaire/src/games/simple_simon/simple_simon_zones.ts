import { PileLayout } from "@/engine/render/layout/pile_layout";
import { isSameSuitRun } from "@/engine/tableau/rules";
import { ZoneSpec } from "@/engine/tableau/zone";
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

/** The stable id of the foundation at the given index. */
export function foundationPileId(index: number): string {
  return `foundation-${index}`;
}

/** The stable id of the tableau column at the given index. */
export function tableauPileId(index: number): string {
  return `tableau-${index}`;
}

/** Downward gap below a column card before the next one. */
export const TABLEAU_CARD_OFFSET = 45;

/** Extra downward gap opened below the hovered card, to say which one it is. */
export const TABLEAU_HOVER_EXPANSION_OFFSET = 15;

/**
 * How a Simple Simon column arranges its cards.
 *
 * Both gaps are the same, as Eight Off's and FreeCell's are: every card is dealt
 * face up, so there are no face-down cards to pack more tightly.
 */
export const TABLEAU_PILE_LAYOUT: PileLayout = {
  kind: "fan-down",
  faceUpGap: TABLEAU_CARD_OFFSET,
  faceDownGap: TABLEAU_CARD_OFFSET,
  hoverExpansion: TABLEAU_HOVER_EXPANSION_OFFSET,
};

/** How a foundation arranges its cards: squarely. */
export const STACKED_PILE_LAYOUT: PileLayout = { kind: "stacked" };

/** The fourteen zones of a Simple Simon board. */
export function simpleSimonZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = buildZoneSpecs();

function buildZoneSpecs(): readonly ZoneSpec[] {
  const zones: ZoneSpec[] = [];

  for (let index = 0; index < FOUNDATION_COUNT; index++) {
    const id = foundationPileId(index);
    zones.push({
      id,
      role: SimpleSimonRole.FOUNDATION,
      slot: { pileId: id, column: FOUNDATION_COLUMN_OFFSET + index, row: 0 },
      layout: STACKED_PILE_LAYOUT,
      // Never a drop target: a run arrives here by completing itself, not by
      // being put here.
      accept: simpleSimonPlacementRule(SimpleSimonRole.FOUNDATION),
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
      role: SimpleSimonRole.TABLEAU,
      slot: { pileId: id, column: index, row: 1 },
      layout: TABLEAU_PILE_LAYOUT,
      accept: simpleSimonPlacementRule(SimpleSimonRole.TABLEAU),
      // Same-suit descending only, which is the same question the build rule
      // does *not* ask — a column takes any descending card and gives up only a
      // single suit. Both halves derive from the shared predicates, so neither
      // can drift from what the other expects.
      grab: { kind: "run", adjacent: isSameSuitRun },
      draggable: true,
      // Every card is dealt face up, so there is nothing to turn over.
      face: "always-up",
      backgroundKey: "card-placeholder",
    });
  }

  return zones;
}

/** Re-exported: the roles live with the rules that branch on them. */
export { SimpleSimonRole };
