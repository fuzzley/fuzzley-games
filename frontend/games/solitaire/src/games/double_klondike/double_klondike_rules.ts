import { PileRole } from "@/engine/core/card/card_pile";
import { Rank } from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  byEmptiness,
  cardIs,
  descendingAlternatingColor,
  hasRank,
  suitFoundation,
} from "@/engine/tableau/rules";

/** The parts a pile can play in a Double Klondike game. */
export const DoubleKlondikeRole = {
  /** The face-down draw pile. */
  STOCK: "stock",
  /** The face-up pile of drawn cards. */
  WASTE: "waste",
  /** A suit pile built up from Ace to King. */
  FOUNDATION: "foundation",
  /** A board column built down in alternating colors. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a Double Klondike pile can play. */
export type DoubleKlondikeRole =
  (typeof DoubleKlondikeRole)[keyof typeof DoubleKlondikeRole];

/**
 * A Double Klondike column: a King starts an empty one, and anything after
 * builds down in alternating colors.
 */
export const DOUBLE_KLONDIKE_TABLEAU_RULE: PlacementRule = byEmptiness(
  cardIs(hasRank(Rank.KING)),
  descendingAlternatingColor,
);

/** A Double Klondike foundation: the standard Ace-up-by-suit pile. */
export const DOUBLE_KLONDIKE_FOUNDATION_RULE: PlacementRule = suitFoundation;

/**
 * Returns what a pile of the given role accepts, or null for the stock and the
 * waste, which are never destinations.
 */
export function doubleKlondikePlacementRule(
  role: string,
): PlacementRule | null {
  switch (role) {
    case DoubleKlondikeRole.TABLEAU:
      return DOUBLE_KLONDIKE_TABLEAU_RULE;
    case DoubleKlondikeRole.FOUNDATION:
      return DOUBLE_KLONDIKE_FOUNDATION_RULE;
    default:
      return null;
  }
}
