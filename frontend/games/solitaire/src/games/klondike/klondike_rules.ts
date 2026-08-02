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

/**
 * A Klondike tableau column: a King starts an empty one, and anything after
 * builds down in alternating colors.
 */
export const KLONDIKE_TABLEAU_RULE: PlacementRule = byEmptiness(
  cardIs(hasRank(Rank.KING)),
  descendingAlternatingColor,
);

/** A Klondike foundation: the standard Ace-up-by-suit pile, one card at a time. */
export const KLONDIKE_FOUNDATION_RULE: PlacementRule = suitFoundation;

/**
 * The rule governing what a pile of the given role accepts, or null for the
 * stock and the waste, which are never move destinations at all.
 *
 * @param role The part the destination pile plays.
 */
export function klondikePlacementRule(role: string): PlacementRule | null {
  switch (role) {
    case KlondikeRole.TABLEAU:
      return KLONDIKE_TABLEAU_RULE;
    case KlondikeRole.FOUNDATION:
      return KLONDIKE_FOUNDATION_RULE;
    default:
      return null;
  }
}
