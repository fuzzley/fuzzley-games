import { PileLayout } from "@/engine/render/layout/pile_layout";
import { ZoneSpec } from "@/engine/tableau/zone";
import {
  FreeCellRole,
  freeCellPlacementRule,
  isOrderedPair,
} from "./freecell_rules";

/** The number of free cells. */
export const CELL_COUNT = 4;

/** The number of suit foundation piles. */
export const FOUNDATION_COUNT = 4;

/** The number of tableau columns. */
export const TABLEAU_COUNT = 8;

/** The stable id of the free cell at the given index. */
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

/** Downward gap below a tableau card before the next one. */
export const TABLEAU_CARD_OFFSET = 45;

/**
 * Extra downward gap opened below the hovered card. Smaller than Klondike's
 * because a FreeCell column shows every card's index corner already; this only
 * needs to say which card the pointer is on.
 */
export const TABLEAU_HOVER_EXPANSION_OFFSET = 15;

/**
 * How a FreeCell column arranges its cards.
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

/** How a cell or a foundation arranges its cards: squarely, and at most a few. */
export const STACKED_PILE_LAYOUT: PileLayout = { kind: "stacked" };

/**
 * The sixteen zones of a FreeCell board.
 *
 * Free cells at the left of the top row, foundations at the right of it, and
 * the eight columns filling the bottom row. Unlike Klondike there is no stock
 * and no waste at all, which is most of why FreeCell is worth building: nothing
 * in the engine may assume a game has either.
 */
export function freeCellZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = buildZoneSpecs();

function buildZoneSpecs(): readonly ZoneSpec[] {
  const zones: ZoneSpec[] = [];

  for (let index = 0; index < CELL_COUNT; index++) {
    const id = cellPileId(index);
    zones.push({
      id,
      role: FreeCellRole.CELL,
      slot: { pileId: id, column: index, row: 0 },
      layout: STACKED_PILE_LAYOUT,
      // The whole point of a cell: it holds exactly one card.
      capacity: 1,
      accept: freeCellPlacementRule(FreeCellRole.CELL),
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
      role: FreeCellRole.FOUNDATION,
      slot: { pileId: id, column: CELL_COUNT + index, row: 0 },
      layout: STACKED_PILE_LAYOUT,
      accept: freeCellPlacementRule(FreeCellRole.FOUNDATION),
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
      role: FreeCellRole.TABLEAU,
      slot: { pileId: id, column: index, row: 1 },
      layout: TABLEAU_PILE_LAYOUT,
      accept: freeCellPlacementRule(FreeCellRole.TABLEAU),
      // Only a properly ordered run may be lifted. Klondike is laxer; FreeCell
      // is not, because a column has no face-down cards to hide a broken one.
      grab: { kind: "run", adjacent: isOrderedPair },
      draggable: true,
      face: "always-up",
      backgroundKey: "card-placeholder",
    });
  }

  return zones;
}

/** Re-exported: the roles live with the rules that branch on them. */
export { FreeCellRole };
