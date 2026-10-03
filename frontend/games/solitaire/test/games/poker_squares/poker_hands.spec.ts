import { describe, it, expect } from "vitest";
import { PlayingCardId, Rank, Suit } from "@/engine/core/card/playing_card";
import { PokerHand, evaluateHand } from "@/games/poker_squares/poker_hands";

/** Returns cards of the given ranks, all of one suit unless suits are given. */
function hand(ranks: Rank[], suits: Suit[] = []): PlayingCardId[] {
  return ranks.map((rank, index) => ({
    rank,
    suit: suits[index] ?? Suit.SPADE,
  }));
}

/** Suits that make no flush. */
const MIXED = [Suit.SPADE, Suit.HEART, Suit.CLUB, Suit.DIAMOND, Suit.SPADE];

describe("evaluateHand", () => {
  it.each([
    [
      "a royal flush",
      hand([Rank.TEN, Rank.JACK, Rank.QUEEN, Rank.KING, Rank.ACE]),
      PokerHand.ROYAL_FLUSH,
    ],
    [
      "a straight flush",
      hand([Rank.FIVE, Rank.SIX, Rank.SEVEN, Rank.EIGHT, Rank.NINE]),
      PokerHand.STRAIGHT_FLUSH,
    ],
    [
      "four of a kind",
      hand([Rank.NINE, Rank.NINE, Rank.NINE, Rank.NINE, Rank.TWO], MIXED),
      PokerHand.FOUR_OF_A_KIND,
    ],
    [
      "a full house",
      hand([Rank.NINE, Rank.NINE, Rank.NINE, Rank.TWO, Rank.TWO], MIXED),
      PokerHand.FULL_HOUSE,
    ],
    [
      "a flush",
      hand([Rank.TWO, Rank.FIVE, Rank.SEVEN, Rank.NINE, Rank.KING]),
      PokerHand.FLUSH,
    ],
    [
      "a straight",
      hand([Rank.FIVE, Rank.SIX, Rank.SEVEN, Rank.EIGHT, Rank.NINE], MIXED),
      PokerHand.STRAIGHT,
    ],
    [
      "a straight with the Ace low",
      hand([Rank.ACE, Rank.TWO, Rank.THREE, Rank.FOUR, Rank.FIVE], MIXED),
      PokerHand.STRAIGHT,
    ],
    [
      "a straight with the Ace high",
      hand([Rank.TEN, Rank.JACK, Rank.QUEEN, Rank.KING, Rank.ACE], MIXED),
      PokerHand.STRAIGHT,
    ],
    [
      "three of a kind",
      hand([Rank.NINE, Rank.NINE, Rank.NINE, Rank.TWO, Rank.FOUR], MIXED),
      PokerHand.THREE_OF_A_KIND,
    ],
    [
      "two pair",
      hand([Rank.NINE, Rank.NINE, Rank.TWO, Rank.TWO, Rank.FOUR], MIXED),
      PokerHand.TWO_PAIR,
    ],
    [
      "one pair",
      hand([Rank.NINE, Rank.NINE, Rank.TWO, Rank.SIX, Rank.FOUR], MIXED),
      PokerHand.ONE_PAIR,
    ],
    [
      "nothing",
      hand([Rank.NINE, Rank.JACK, Rank.TWO, Rank.SIX, Rank.FOUR], MIXED),
      PokerHand.NOTHING,
    ],
  ])("recognises %s", (_name, cards, expected) => {
    expect(evaluateHand(cards)).toBe(expected);
  });

  it("does not wrap a straight round the corner", () => {
    const cards = hand(
      [Rank.QUEEN, Rank.KING, Rank.ACE, Rank.TWO, Rank.THREE],
      MIXED,
    );

    expect(evaluateHand(cards)).toBe(PokerHand.NOTHING);
  });

  it("counts a pair in a line still filling", () => {
    expect(evaluateHand(hand([Rank.NINE, Rank.NINE, Rank.TWO], MIXED))).toBe(
      PokerHand.ONE_PAIR,
    );
  });

  it("counts no flush until the line holds five cards", () => {
    expect(
      evaluateHand(hand([Rank.TWO, Rank.FIVE, Rank.SEVEN, Rank.NINE])),
    ).toBe(PokerHand.NOTHING);
  });
});
