import {
  PlayingCard,
  Rank,
  Suit,
  rankBelow,
  rankBelowWrapping,
} from "@/engine/core/card/playing_card";

/**
 * Says whether `upper` may sit directly on `lower`.
 *
 * A zone's `run` grab rule and its build rule both ask this, and deriving both
 * from one adjacency is what keeps them in agreement.
 */
export type Adjacency = (lower: PlayingCard, upper: PlayingCard) => boolean;

/** Returns whether the card is a red suit (hearts or diamonds). */
export function isRed(card: PlayingCard): boolean {
  return card.suit === Suit.HEART || card.suit === Suit.DIAMOND;
}

/**
 * Returns whether `upper` may sit on `lower` as in Klondike: one rank down, in
 * the other colour.
 */
export function isOrderedPair(lower: PlayingCard, upper: PlayingCard): boolean {
  return upper.rank === rankBelow(lower.rank) && isRed(lower) !== isRed(upper);
}

/**
 * Returns whether `upper` may sit on `lower` as in a Spider run: one rank
 * down, in the same suit.
 */
export function isSameSuitRun(lower: PlayingCard, upper: PlayingCard): boolean {
  return lower.suit === upper.suit && upper.rank === rankBelow(lower.rank);
}

/**
 * Returns whether `upper` may sit on `lower` as in Whitehead: one rank down, in
 * the same colour.
 */
export function isSameColorRun(
  lower: PlayingCard,
  upper: PlayingCard,
): boolean {
  return upper.rank === rankBelow(lower.rank) && isRed(lower) === isRed(upper);
}

/**
 * Returns whether `upper` may sit on `lower` as in Thumb and Pouch: one rank
 * down, in any suit but `lower`'s own.
 */
export function isDifferentSuitRun(
  lower: PlayingCard,
  upper: PlayingCard,
): boolean {
  return lower.suit !== upper.suit && upper.rank === rankBelow(lower.rank);
}

/**
 * Returns whether `upper` may sit on `lower` as in a Spider build: one rank
 * down, in any suit.
 */
export function isAnySuitRun(lower: PlayingCard, upper: PlayingCard): boolean {
  return upper.rank === rankBelow(lower.rank);
}

/**
 * Returns whether `upper` may sit on `lower` as in a Penguin run: one rank
 * down in the same suit, with an Ace taking a King.
 */
export function isSameSuitRunWrapping(
  lower: PlayingCard,
  upper: PlayingCard,
): boolean {
  return (
    lower.suit === upper.suit && upper.rank === rankBelowWrapping(lower.rank)
  );
}

/**
 * Returns whether `upper` may sit on `lower` as in Canfield: one rank down in
 * the other colour, with an Ace taking a King.
 */
export function isOrderedPairWrapping(
  lower: PlayingCard,
  upper: PlayingCard,
): boolean {
  return (
    upper.rank === rankBelowWrapping(lower.rank) &&
    isRed(lower) !== isRed(upper)
  );
}

/**
 * Returns whether `upper` may sit on `lower` as in Rainbow: one rank down in
 * any suit, with an Ace taking a King.
 */
export function isAnySuitRunWrapping(
  lower: PlayingCard,
  upper: PlayingCard,
): boolean {
  return upper.rank === rankBelowWrapping(lower.rank);
}

/**
 * Returns an adjacency that holds when the two cards are one rank apart either
 * way, in any suit, as on a Golf foundation.
 *
 * @param wraps Whether an Ace and a King count as one rank apart.
 */
export function isAdjacentRank(wraps: boolean): Adjacency {
  return (lower, upper) => {
    const apart = Math.abs(lower.rank - upper.rank);
    return apart === 1 || (wraps && apart === Rank.KING - Rank.ACE);
  };
}
