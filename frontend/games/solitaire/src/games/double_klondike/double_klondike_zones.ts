import { PileLayout } from "@/engine/render/layout/pile_layout";
import { ZoneSpec } from "@/engine/tableau/zone";
import {
  DoubleKlondikeRole,
  doubleKlondikePlacementRule,
} from "./double_klondike_rules";

/** The number of tableau columns. */
export const TABLEAU_COUNT = 9;

/**
 * The number of foundations: eight, two per suit, because the game is dealt
 * from two decks.
 */
export const FOUNDATION_COUNT = 8;

/** The stable id of the single stock pile. */
export const STOCK_PILE_ID = "stock";

/** The stable id of the single waste pile. */
export const WASTE_PILE_ID = "waste";

/**
 * The grid column the leftmost foundation sits in.
 *
 * Stock at 0, waste at 1, and column 2 left clear for the waste fan to grow
 * into — exactly as Klondike arranges its own top row, and for the same reason:
 * a draw of three fans rightwards and would otherwise run into the first
 * foundation.
 */
export const FOUNDATION_COLUMN_OFFSET = 3;

/**
 * How many grid columns the board is wide.
 *
 * The top row binds, as it does in Eight Off and Maria: stock, waste, a clear
 * column and eight foundations need eleven slots, while only nine columns hang
 * beneath them.
 */
export const BOARD_COLUMN_COUNT = FOUNDATION_COLUMN_OFFSET + FOUNDATION_COUNT;

/**
 * The grid column the leftmost tableau column sits in.
 *
 * Derived rather than written as `1`, so it stays centred if the counts above
 * ever change.
 */
export const TABLEAU_COLUMN_OFFSET = Math.floor(
  (BOARD_COLUMN_COUNT - TABLEAU_COUNT) / 2,
);

/** The stable id of the foundation pile at the given index. */
export function foundationPileId(index: number): string {
  return `foundation-${index}`;
}

/** The stable id of the tableau column at the given index. */
export function tableauPileId(index: number): string {
  return `tableau-${index}`;
}

/** Downward gap below a face-up tableau card before the next card. */
export const TABLEAU_FACE_UP_OFFSET = 45;

/** Downward gap below a face-down tableau card before the next card. */
export const TABLEAU_FACE_DOWN_OFFSET = 18;

/** Extra downward gap opened below the hovered card. */
export const TABLEAU_HOVER_EXPANSION_OFFSET = 15;

/** Horizontal gap between fanned waste cards, as Klondike fans its own. */
export const WASTE_FAN_OFFSET_X = 55;

/** Maximum number of waste cards to fan. */
export const WASTE_MAX_FAN_CARDS = 3;

/** How a Double Klondike column arranges its cards. */
export const TABLEAU_PILE_LAYOUT: PileLayout = {
  kind: "fan-down",
  faceUpGap: TABLEAU_FACE_UP_OFFSET,
  faceDownGap: TABLEAU_FACE_DOWN_OFFSET,
  hoverExpansion: TABLEAU_HOVER_EXPANSION_OFFSET,
};

/** How the waste arranges its cards: the last three fanned rightwards. */
export const WASTE_PILE_LAYOUT: PileLayout = {
  kind: "fan-right",
  gap: WASTE_FAN_OFFSET_X,
  maxVisible: WASTE_MAX_FAN_CARDS,
};

/** How the stock and the foundations arrange their cards: squarely. */
export const STACKED_PILE_LAYOUT: PileLayout = { kind: "stacked" };

/** The nineteen zones of a Double Klondike board. */
export function doubleKlondikeZoneSpecs(): readonly ZoneSpec[] {
  return ZONES;
}

const ZONES: readonly ZoneSpec[] = buildZoneSpecs();

function buildZoneSpecs(): readonly ZoneSpec[] {
  const zones: ZoneSpec[] = [
    {
      id: STOCK_PILE_ID,
      role: DoubleKlondikeRole.STOCK,
      slot: { pileId: STOCK_PILE_ID, column: 0, row: 0 },
      layout: STACKED_PILE_LAYOUT,
      accept: doubleKlondikePlacementRule(DoubleKlondikeRole.STOCK),
      // The top card is clickable — that is what draws — but pressing it must
      // not pick it up.
      grab: { kind: "top-only" },
      draggable: false,
      face: "always-down",
      backgroundKey: "card-placeholder-full-border-reset",
      // Clicking the empty slot recycles the waste, as in Klondike.
      emptyIsActionable: true,
    },
    {
      id: WASTE_PILE_ID,
      role: DoubleKlondikeRole.WASTE,
      slot: { pileId: WASTE_PILE_ID, column: 1, row: 0 },
      layout: WASTE_PILE_LAYOUT,
      accept: doubleKlondikePlacementRule(DoubleKlondikeRole.WASTE),
      grab: { kind: "top-only" },
      draggable: true,
      face: "always-up",
      // No placeholder: the waste fans over bare table rather than sitting in a
      // marked slot.
    },
  ];

  for (let index = 0; index < FOUNDATION_COUNT; index++) {
    const id = foundationPileId(index);
    zones.push({
      id,
      role: DoubleKlondikeRole.FOUNDATION,
      slot: { pileId: id, column: FOUNDATION_COLUMN_OFFSET + index, row: 0 },
      layout: STACKED_PILE_LAYOUT,
      accept: doubleKlondikePlacementRule(DoubleKlondikeRole.FOUNDATION),
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
      role: DoubleKlondikeRole.TABLEAU,
      slot: {
        pileId: id,
        column: TABLEAU_COLUMN_OFFSET + index,
        row: 1,
      },
      layout: TABLEAU_PILE_LAYOUT,
      accept: doubleKlondikePlacementRule(DoubleKlondikeRole.TABLEAU),
      // Any face-up card, ordered or not — Klondike's deliberately lax rule,
      // kept here so the two play the same way.
      grab: { kind: "any-face-up" },
      draggable: true,
      face: "card",
      backgroundKey: "card-placeholder",
    });
  }

  return zones;
}

/** Re-exported: the roles live with the rules that branch on them. */
export { DoubleKlondikeRole };
