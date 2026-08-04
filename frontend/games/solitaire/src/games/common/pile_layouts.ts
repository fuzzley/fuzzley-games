import { PileLayout } from "@/engine/render/layout/pile_layout";

/**
 * The arrangements a solitaire pile uses, and the gaps they are cut from.
 *
 * These numbers were re-declared in every game that used them — the same 45,
 * 18 and 15 in thirteen files — so a board could be retuned without the others
 * following. They are a house style rather than a rule of any one game, which
 * is what makes them shared.
 */

/** Downward gap below a face-up tableau card before the next card. */
export const TABLEAU_FACE_UP_OFFSET = 45;

/**
 * Downward gap below a face-down tableau card before the next card.
 *
 * Tighter than the face-up gap: a buried card shows nothing worth reading, so
 * it only has to say that it is there.
 */
export const TABLEAU_FACE_DOWN_OFFSET = 18;

/**
 * Extra downward gap opened below the hovered tableau card, so the cards fanned
 * on top slide down and reveal more of it.
 */
export const TABLEAU_HOVER_EXPANSION_OFFSET = 15;

/** How a cell, a foundation or a stock arranges its cards: squarely. */
export const STACKED_PILE_LAYOUT: PileLayout = { kind: "stacked" };

/**
 * How a column arranges its cards when some of them are dealt face down.
 *
 * The two gaps differ, so a run of buried cards packs tighter than the readable
 * ones above it.
 */
export const BURIED_COLUMN_LAYOUT: PileLayout = {
  kind: "fan-down",
  faceUpGap: TABLEAU_FACE_UP_OFFSET,
  faceDownGap: TABLEAU_FACE_DOWN_OFFSET,
  hoverExpansion: TABLEAU_HOVER_EXPANSION_OFFSET,
};

/**
 * How a column arranges its cards when every one of them is face up.
 *
 * Both gaps are the same: there are no face-down cards to pack more tightly, so
 * a second gap would only be a number that never applies.
 */
export const OPEN_COLUMN_LAYOUT: PileLayout = {
  kind: "fan-down",
  faceUpGap: TABLEAU_FACE_UP_OFFSET,
  faceDownGap: TABLEAU_FACE_UP_OFFSET,
  hoverExpansion: TABLEAU_HOVER_EXPANSION_OFFSET,
};
