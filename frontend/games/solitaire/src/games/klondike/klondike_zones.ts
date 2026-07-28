import { PileRole } from "@/engine/core/card/card_pile";

/**
 * The parts a pile can play in a Klondike game.
 *
 * Klondike's own vocabulary, not the engine's: rule checks, scoring, layout and
 * gestures all branch on these, and a different game names different roles.
 */
export const KlondikeRole = {
  /** The face-down draw pile. */
  STOCK: "stock",
  /** The face-up pile of drawn cards. */
  WASTE: "waste",
  /** A suit pile built up from Ace to King. */
  FOUNDATION: "foundation",
  /** A board column built down in alternating colors. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** One of the parts a Klondike pile can play. */
export type KlondikeRole = (typeof KlondikeRole)[keyof typeof KlondikeRole];

/** The number of suit foundation piles in a standard Klondike game. */
export const FOUNDATION_COUNT = 4;

/** The number of tableau columns in a standard Klondike game. */
export const TABLEAU_COUNT = 7;

/** The stable id of the single stock pile. */
export const STOCK_PILE_ID = "stock";

/** The stable id of the single waste pile. */
export const WASTE_PILE_ID = "waste";

/**
 * The stable id of the foundation pile at the given index.
 *
 * Both the game model and the render layout derive pile ids through this
 * function so the two can never drift apart.
 */
export function foundationPileId(index: number): string {
  return `foundation-${index}`;
}

/** The stable id of the tableau column at the given index. See {@link foundationPileId}. */
export function tableauPileId(index: number): string {
  return `tableau-${index}`;
}
