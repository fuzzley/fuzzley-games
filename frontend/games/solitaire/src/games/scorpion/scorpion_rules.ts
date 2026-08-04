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

/** One of the parts a Scorpion pile can play. */
export type ScorpionRole = (typeof ScorpionRole)[keyof typeof ScorpionRole];

/**
 * A Scorpion column: only a King starts an empty one, and anything after builds
 * down by rank in the same suit.
 *
 * Strict in exactly the place Spider is lax. Spider lets any card land anywhere
 * that descends and then punishes you for it when the mixed pile will not lift;
 * Scorpion refuses the landing instead, and lets you lift anything at all. The
 * King-only rule on an empty column is what makes an emptied column a resource
 * rather than a free parking space.
 */
export const SCORPION_TABLEAU_RULE: PlacementRule = byEmptiness(
  cardIs(hasRank(Rank.KING)),
  descendingSameSuit,
);

/**
 * The rule governing what a pile of the given role accepts, or null for one that
 * is never a destination.
 *
 * Only a column is. The stock is never dropped onto, and neither is a
 * foundation: a completed run arrives there by finishing itself, not by being
 * put there.
 */
export function scorpionPlacementRule(role: string): PlacementRule | null {
  switch (role) {
    case ScorpionRole.TABLEAU:
      return SCORPION_TABLEAU_RULE;
    default:
      return null;
  }
}
