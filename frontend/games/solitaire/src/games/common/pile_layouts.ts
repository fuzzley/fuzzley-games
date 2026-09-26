import { PileLayout } from "@/engine/render/layout/pile_layout";

/** Defines the arrangements solitaire piles use and the gaps between cards. */

/** Downward gap below a face-up tableau card before the next card. */
export const TABLEAU_FACE_UP_OFFSET = 45;

/** Downward gap below a face-down tableau card before the next card. */
export const TABLEAU_FACE_DOWN_OFFSET = 18;

/**
 * Extra downward gap opened below the hovered tableau card, so the cards fanned
 * on top slide down and reveal more of it.
 */
export const TABLEAU_HOVER_EXPANSION_OFFSET = 15;

/** How a cell, a foundation or a stock arranges its cards: squarely. */
export const STACKED_PILE_LAYOUT: PileLayout = { kind: "stacked" };

/**
 * Horizontal gap between fanned waste cards, wide enough to show each card's
 * index corner.
 *
 * A three card fan stays clear of the first foundation up to a gap of about
 * 125.
 */
export const WASTE_FAN_OFFSET_X = 55;

/** Maximum number of waste cards to fan the edges of in multi-draw mode. */
export const WASTE_MAX_FAN_CARDS = 3;

/**
 * Returns how a waste arranges its cards when each draw turns over
 * `drawCount`, showing only the top card when that is one.
 */
export function wasteFanLayout(drawCount: number): PileLayout {
  return {
    kind: "fan-right",
    gap: WASTE_FAN_OFFSET_X,
    maxVisible: drawCount === 1 ? 1 : WASTE_MAX_FAN_CARDS,
  };
}

/** How a column arranges its cards when some of them are dealt face down. */
export const BURIED_COLUMN_LAYOUT: PileLayout = {
  kind: "fan-down",
  faceUpGap: TABLEAU_FACE_UP_OFFSET,
  faceDownGap: TABLEAU_FACE_DOWN_OFFSET,
  hoverExpansion: TABLEAU_HOVER_EXPANSION_OFFSET,
};

/** How a column arranges its cards when every one of them is face up. */
export const OPEN_COLUMN_LAYOUT: PileLayout = {
  kind: "fan-down",
  faceUpGap: TABLEAU_FACE_UP_OFFSET,
  faceDownGap: TABLEAU_FACE_UP_OFFSET,
  hoverExpansion: TABLEAU_HOVER_EXPANSION_OFFSET,
};
