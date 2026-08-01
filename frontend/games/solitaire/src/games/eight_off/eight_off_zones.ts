import { PileLayout } from "@/engine/render/layout/pile_layout";
import { isSameSuitRun } from "@/engine/tableau/rules";
import { ZoneSpec } from "@/engine/tableau/zone";
import { EightOffRole, eightOffPlacementRule } from "./eight_off_rules";

/** The number of free cells. Eight of them, which is where the name comes from. */
export const CELL_COUNT = 8;

/** The number of suit foundation piles. */
export const FOUNDATION_COUNT = 4;

/** The number of tableau columns. */
export const TABLEAU_COUNT = 8;

/**
 * How many grid columns the board is wide.
 *
 * The top row is the binding one: eight cells and four foundations have to sit
 * side by side, so the board is twelve wide even though only eight columns hang
 * beneath it. See the layout for why that is the right trade.
 */
export const BOARD_COLUMN_COUNT = CELL_COUNT + FOUNDATION_COUNT;

/**
 * The grid column the leftmost tableau starts in.
 *
 * Derived rather than written as `2`, so it stays centred if the counts above
 * ever change. `SlotPlacement.column` is a free integer and the board centres
 * itself as a whole, so an indented row costs the engine nothing.
 */
export const TABLEAU_COLUMN_OFFSET = Math.floor(
  (BOARD_COLUMN_COUNT - TABLEAU_COUNT) / 2,
);

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

/** Extra downward gap opened below the hovered card, to say which one it is. */
export const TABLEAU_HOVER_EXPANSION_OFFSET = 15;

/**
 * How an Eight Off column arranges its cards.
 *
 * Both gaps are the same, for the same reason FreeCell's are: every card is
 * dealt face up, so there are no face-down cards to pack more tightly.
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
 * The twenty zones of an Eight Off board.
 *
 * Eight cells at the left of the top row, four foundations at the right of it,
 * and the eight columns centred beneath. Twice FreeCell's cells and a
 * one-suit build make it a far gentler game than its ancestor, which is the
 * only interesting thing about it as a variant — and none of that is code here,
 * it is the numbers above and the rules the zones point at.
 */
export function eightOffZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = buildZoneSpecs();

function buildZoneSpecs(): readonly ZoneSpec[] {
  const zones: ZoneSpec[] = [];

  for (let index = 0; index < CELL_COUNT; index++) {
    const id = cellPileId(index);
    zones.push({
      id,
      role: EightOffRole.CELL,
      slot: { pileId: id, column: index, row: 0 },
      layout: STACKED_PILE_LAYOUT,
      // The whole point of a cell: it holds exactly one card.
      capacity: 1,
      accept: eightOffPlacementRule(EightOffRole.CELL),
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
      role: EightOffRole.FOUNDATION,
      slot: { pileId: id, column: CELL_COUNT + index, row: 0 },
      layout: STACKED_PILE_LAYOUT,
      accept: eightOffPlacementRule(EightOffRole.FOUNDATION),
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
      role: EightOffRole.TABLEAU,
      slot: {
        pileId: id,
        column: TABLEAU_COLUMN_OFFSET + index,
        row: 1,
      },
      layout: TABLEAU_PILE_LAYOUT,
      accept: eightOffPlacementRule(EightOffRole.TABLEAU),
      // A run here is one suit, not merely one colour, which is the same
      // question the build rule asks — so both derive from `isSameSuitRun` and
      // cannot drift apart.
      grab: { kind: "run", adjacent: isSameSuitRun },
      draggable: true,
      // Every card is dealt face up, so nothing is ever turned over and the
      // game has no hidden information at all.
      face: "always-up",
      backgroundKey: "card-placeholder",
    });
  }

  return zones;
}

/** Re-exported: the roles live with the rules that branch on them. */
export { EightOffRole };
