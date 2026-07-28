import { Rank } from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  byEmptiness,
  cardIs,
  descendingAlternatingColor,
  hasRank,
  never,
  suitFoundation,
} from "@/engine/tableau/rules";
import { KlondikeRole } from "./klondike_zones";

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
 * The rule governing what a pile of the given role accepts. The stock and the
 * waste accept nothing — they are never move destinations.
 *
 * @param role The part the destination pile plays.
 */
export function klondikePlacementRule(role: string): PlacementRule {
  switch (role) {
    case KlondikeRole.TABLEAU:
      return KLONDIKE_TABLEAU_RULE;
    case KlondikeRole.FOUNDATION:
      return KLONDIKE_FOUNDATION_RULE;
    default:
      return never;
  }
}
