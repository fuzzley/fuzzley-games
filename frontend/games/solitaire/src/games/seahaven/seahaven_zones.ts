import { PileLayout } from "@/engine/render/layout/pile_layout";
import { isSameSuitRun } from "@/engine/tableau/rules";
import { ZoneSpec } from "@/engine/tableau/zone";
import { SeahavenRole, seahavenPlacementRule } from "./seahaven_rules";

/** The number of holding cells. Four, as in FreeCell rather than Eight Off. */
export const CELL_COUNT = 4;

/** The number of suit foundation piles. */
export const FOUNDATION_COUNT = 4;

/** The number of tableau columns. */
export const TABLEAU_COUNT = 10;

/**
 * The grid column the leftmost foundation sits in.
 *
 * Cells at the left of the top row and foundations at the right, as Eight Off
 * arranges them. Ten columns leaves two clear between the two groups, which is
 * what keeps a cell from reading as a foundation at a glance.
 */
export const FOUNDATION_COLUMN_OFFSET = TABLEAU_COUNT - FOUNDATION_COUNT;

/** The stable id of the cell at the given index. */
export function cellPileId(index: number): string {
  return `cell-${index}`;
}

/** The stable id of the foundation pile at the given index. */
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
 * How a Seahaven column arranges its cards.
 *
 * Both gaps are the same: every card is dealt face up, so there are no
 * face-down cards to pack more tightly.
 */
export const TABLEAU_PILE_LAYOUT: PileLayout = {
  kind: "fan-down",
  faceUpGap: TABLEAU_CARD_OFFSET,
  faceDownGap: TABLEAU_CARD_OFFSET,
  hoverExpansion: TABLEAU_HOVER_EXPANSION_OFFSET,
};

/** How a cell or a foundation arranges its cards: squarely. */
export const STACKED_PILE_LAYOUT: PileLayout = { kind: "stacked" };

/** The eighteen zones of a Seahaven Towers board. */
export function seahavenZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = buildZoneSpecs();

function buildZoneSpecs(): readonly ZoneSpec[] {
  const zones: ZoneSpec[] = [];

  for (let index = 0; index < CELL_COUNT; index++) {
    const id = cellPileId(index);
    zones.push({
      id,
      role: SeahavenRole.CELL,
      slot: { pileId: id, column: index, row: 0 },
      layout: STACKED_PILE_LAYOUT,
      // The whole point of a cell: it holds exactly one card.
      capacity: 1,
      accept: seahavenPlacementRule(SeahavenRole.CELL),
      grab: { kind: "top-only" },
      draggable: true,
      face: "always-up",
      backgroundKey: "card-placeholder",
    });
  }

  for (let index = 0; index < FOUNDATION_COUNT; index++) {
    const id = foundationPileId(index);
    zones.push({
      id,
      role: SeahavenRole.FOUNDATION,
      slot: { pileId: id, column: FOUNDATION_COLUMN_OFFSET + index, row: 0 },
      layout: STACKED_PILE_LAYOUT,
      accept: seahavenPlacementRule(SeahavenRole.FOUNDATION),
      grab: { kind: "top-only" },
      draggable: true,
      face: "always-up",
      backgroundKey: "card-placeholder-full-border-circle",
    });
  }

  for (let index = 0; index < TABLEAU_COUNT; index++) {
    const id = tableauPileId(index);
    zones.push({
      id,
      role: SeahavenRole.TABLEAU,
      slot: { pileId: id, column: index, row: 1 },
      layout: TABLEAU_PILE_LAYOUT,
      accept: seahavenPlacementRule(SeahavenRole.TABLEAU),
      // A run here is one suit, not merely one colour, which is the same
      // question the build rule asks — so both derive from `isSameSuitRun` and
      // cannot drift apart.
      grab: { kind: "run", adjacent: isSameSuitRun },
      draggable: true,
      // Every card is dealt face up, so nothing is ever turned over.
      face: "always-up",
      backgroundKey: "card-placeholder",
    });
  }

  return zones;
}

/** Re-exported: the roles live with the rules that branch on them. */
export { SeahavenRole };
