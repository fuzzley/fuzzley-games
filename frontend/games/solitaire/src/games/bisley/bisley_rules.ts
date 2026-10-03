import { PileRole } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank, Suit } from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  all,
  any,
  ascendingSameSuit,
  byEmptiness,
  cardIs,
  descendingSameSuit,
  never,
  singleCardOnly,
} from "@/engine/tableau/rules";

/** The parts a pile can play in a Bisley game. */
export const BisleyRole = {
  /**
   * A suit pile, built up from its Ace or down from its King: both kinds play
   * this part, so the game is won when every card is on either.
   */
  FOUNDATION: "foundation",
  /** A board column, built up or down in suit. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a Bisley pile can play. */
export type BisleyRole = (typeof BisleyRole)[keyof typeof BisleyRole];

/** Returns a predicate matching one card by its suit and rank. */
function isCard(suit: Suit, rank: Rank): (card: PlayingCard) => boolean {
  return (card) => card.suit === suit && card.rank === rank;
}

/**
 * Returns the rule for a suit's Ace foundation: its own Ace, then up in suit.
 *
 * Only that suit's Ace, rather than any, so that taking the Ace back off cannot
 * let another suit's Ace take the place its King foundation is paired with.
 */
export function aceFoundationRule(suit: Suit): PlacementRule {
  return all(
    singleCardOnly,
    byEmptiness(cardIs(isCard(suit, Rank.ACE)), ascendingSameSuit),
  );
}

/** Returns the rule for a suit's King foundation: its own King, then down. */
export function kingFoundationRule(suit: Suit): PlacementRule {
  return all(
    singleCardOnly,
    byEmptiness(cardIs(isCard(suit, Rank.KING)), descendingSameSuit),
  );
}

/**
 * A Bisley column: builds up or down in suit, and an empty one stays empty.
 *
 * `never` for the empty case rather than a null `accept`, which would stop the
 * column being a drop target even while it holds cards.
 */
export const BISLEY_TABLEAU_RULE: PlacementRule = byEmptiness(
  never,
  any(ascendingSameSuit, descendingSameSuit),
);
