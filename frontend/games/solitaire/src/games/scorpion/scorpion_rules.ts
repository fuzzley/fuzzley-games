import { PileRole } from "@/engine/core/card/card_pile";
import { Rank } from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  byEmptiness,
  cardIs,
  descendingSameSuit,
  hasRank,
} from "@/engine/tableau/rules";

/** The parts a pile can play in a Scorpion game. */
export const ScorpionRole = {
  /** The three-card pile that deals itself out in one press. */
  STOCK: "stock",
  /** Where a completed King-to-Ace run goes. */
  FOUNDATION: "foundation",
  /** A board column built down in the same suit. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a Scorpion pile can play. */
export type ScorpionRole = (typeof ScorpionRole)[keyof typeof ScorpionRole];

/**
 * A Scorpion column: only a King starts an empty one, and anything after builds
 * down by rank in the same suit.
 */
export const SCORPION_TABLEAU_RULE: PlacementRule = byEmptiness(
  cardIs(hasRank(Rank.KING)),
  descendingSameSuit,
);

/**
 * Returns what a pile of a role accepts, or null for the stock and the
 * foundations, where a player never puts a card.
 */
export function scorpionPlacementRule(role: string): PlacementRule | null {
  switch (role) {
    case ScorpionRole.TABLEAU:
      return SCORPION_TABLEAU_RULE;
    default:
      return null;
  }
}
