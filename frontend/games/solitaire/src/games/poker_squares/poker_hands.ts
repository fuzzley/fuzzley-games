import { PlayingCardId, Rank } from "@/engine/core/card/playing_card";

/** Names the poker hands a line of Poker Squares can make, weakest first. */
export const PokerHand = {
  NOTHING: 0,
  ONE_PAIR: 1,
  TWO_PAIR: 2,
  THREE_OF_A_KIND: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  FOUR_OF_A_KIND: 7,
  STRAIGHT_FLUSH: 8,
  ROYAL_FLUSH: 9,
} as const;

/** Names one poker hand. */
export type PokerHand = (typeof PokerHand)[keyof typeof PokerHand];

/** How many cards make a full hand, and so a full line of the grid. */
export const HAND_SIZE = 5;

/**
 * Returns the best poker hand the cards make.
 *
 * A line still filling counts what it has so far: its pairs, threes and fours
 * score as soon as they are there, while a straight or a flush needs all five
 * cards.
 */
export function evaluateHand(cards: readonly PlayingCardId[]): PokerHand {
  const counts = [...rankCounts(cards).values()].sort((a, b) => b - a);
  const [most = 0, next = 0] = counts;
  const full = cards.length === HAND_SIZE;
  const flush = full && new Set(cards.map((card) => card.suit)).size === 1;
  const straight = full && isStraight(cards);

  if (straight && flush) {
    return isAceHigh(cards) ? PokerHand.ROYAL_FLUSH : PokerHand.STRAIGHT_FLUSH;
  }
  if (most === 4) return PokerHand.FOUR_OF_A_KIND;
  if (most === 3 && next === 2) return PokerHand.FULL_HOUSE;
  if (flush) return PokerHand.FLUSH;
  if (straight) return PokerHand.STRAIGHT;
  if (most === 3) return PokerHand.THREE_OF_A_KIND;
  if (most === 2 && next === 2) return PokerHand.TWO_PAIR;
  if (most === 2) return PokerHand.ONE_PAIR;
  return PokerHand.NOTHING;
}

/** Counts how many cards of each rank there are. */
function rankCounts(cards: readonly PlayingCardId[]): Map<Rank, number> {
  const counts = new Map<Rank, number>();
  for (const card of cards) {
    counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
  }
  return counts;
}

/**
 * Returns whether five cards run in rank without a gap, the Ace counting low
 * below the Two or high above the King.
 */
function isStraight(cards: readonly PlayingCardId[]): boolean {
  const ranks = [...new Set(cards.map((card) => card.rank))].sort(
    (a, b) => a - b,
  );
  if (ranks.length !== HAND_SIZE) return false;
  const lowest = ranks[0] ?? Rank.ACE;
  const highest = ranks[HAND_SIZE - 1] ?? Rank.ACE;
  return highest - lowest === HAND_SIZE - 1 || isAceHigh(cards);
}

/** Returns whether the cards are the Ten, Jack, Queen, King and Ace. */
function isAceHigh(cards: readonly PlayingCardId[]): boolean {
  const ranks = new Set(cards.map((card) => card.rank));
  return (
    ranks.size === HAND_SIZE &&
    [Rank.TEN, Rank.JACK, Rank.QUEEN, Rank.KING, Rank.ACE].every((rank) =>
      ranks.has(rank),
    )
  );
}
