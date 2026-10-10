import { describe, it, expect } from "vitest";
import { PlayingCard, Rank, Suit } from "@/engine/core/card/playing_card";
import {
  isAdjacentRank,
  isDifferentSuitRun,
  isOrderedPair,
  isRed,
  isSameColorRun,
  isSameSuitRun,
} from "@/engine/tableau/rules/adjacency";
import { makePlayingCard } from "@test/support/card_builder";

const blackKing = () =>
  makePlayingCard({ suit: Suit.SPADE, rank: Rank.KING, id: "sk" });

const redQueen = () =>
  makePlayingCard({ suit: Suit.HEART, rank: Rank.QUEEN, id: "hq" });

const blackQueen = () =>
  makePlayingCard({ suit: Suit.CLUB, rank: Rank.QUEEN, id: "cq" });

const spadeQueen = () =>
  makePlayingCard({ suit: Suit.SPADE, rank: Rank.QUEEN, id: "sq" });

/** Returns a card of the given suit and rank, with an id naming both. */
function card(suit: Suit, rank: Rank): PlayingCard {
  return makePlayingCard({ suit, rank, id: `${suit}-${rank}`, faceUp: true });
}

describe("isRed", () => {
  it("is true for hearts", () => {
    expect(isRed(makePlayingCard({ suit: Suit.HEART }))).toBe(true);
  });

  it("is false for spades", () => {
    expect(isRed(makePlayingCard({ suit: Suit.SPADE }))).toBe(false);
  });
});

describe("isOrderedPair", () => {
  it("accepts one rank down in the other color", () => {
    expect(isOrderedPair(blackKing(), redQueen())).toBe(true);
  });

  it("rejects the same color", () => {
    expect(isOrderedPair(blackKing(), blackQueen())).toBe(false);
  });

  it("rejects a rank that is not one lower", () => {
    const redJack = makePlayingCard({
      suit: Suit.HEART,
      rank: Rank.JACK,
      id: "hj",
    });

    expect(isOrderedPair(blackKing(), redJack)).toBe(false);
  });
});

describe("isSameSuitRun", () => {
  it("accepts one rank down in the same suit", () => {
    expect(isSameSuitRun(blackKing(), spadeQueen())).toBe(true);
  });

  it("rejects the same color in a different suit", () => {
    expect(isSameSuitRun(blackKing(), blackQueen())).toBe(false);
  });

  it("rejects a rank that is not one lower", () => {
    const spadeJack = makePlayingCard({
      suit: Suit.SPADE,
      rank: Rank.JACK,
      id: "sj",
    });

    expect(isSameSuitRun(blackKing(), spadeJack)).toBe(false);
  });

  it("rejects anything under an Ace", () => {
    const ace = makePlayingCard({ suit: Suit.SPADE, rank: Rank.ACE, id: "sa" });

    expect(isSameSuitRun(ace, spadeQueen())).toBe(false);
  });
});

describe("isSameColorRun", () => {
  it("accepts one rank down in the same suit", () => {
    expect(isSameColorRun(blackKing(), spadeQueen())).toBe(true);
  });

  it("accepts one rank down in the other suit of the same color", () => {
    expect(isSameColorRun(blackKing(), blackQueen())).toBe(true);
  });

  it("rejects the other color", () => {
    expect(isSameColorRun(blackKing(), redQueen())).toBe(false);
  });

  it("rejects a rank that is not one lower", () => {
    const spadeJack = makePlayingCard({
      suit: Suit.SPADE,
      rank: Rank.JACK,
      id: "sj",
    });

    expect(isSameColorRun(blackKing(), spadeJack)).toBe(false);
  });
});

describe("isDifferentSuitRun", () => {
  it("accepts one rank down in the other color", () => {
    expect(isDifferentSuitRun(blackKing(), redQueen())).toBe(true);
  });

  it("accepts one rank down in another suit of the same color", () => {
    expect(isDifferentSuitRun(blackKing(), blackQueen())).toBe(true);
  });

  it("rejects the same suit", () => {
    expect(isDifferentSuitRun(blackKing(), spadeQueen())).toBe(false);
  });

  it("rejects a rank that is not one lower", () => {
    const redJack = makePlayingCard({
      suit: Suit.HEART,
      rank: Rank.JACK,
      id: "hj",
    });

    expect(isDifferentSuitRun(blackKing(), redJack)).toBe(false);
  });
});

describe("isAdjacentRank", () => {
  it("holds for cards one rank apart, upwards or downwards, in any suit", () => {
    const adjacent = isAdjacentRank(false);

    const pairs = [
      adjacent(card(Suit.SPADE, Rank.FIVE), card(Suit.HEART, Rank.SIX)),
      adjacent(card(Suit.SPADE, Rank.FIVE), card(Suit.CLUB, Rank.FOUR)),
    ];

    expect(pairs).toEqual([true, true]);
  });

  it("refuses cards two ranks apart", () => {
    const adjacent = isAdjacentRank(true);

    expect(
      adjacent(card(Suit.SPADE, Rank.FIVE), card(Suit.HEART, Rank.SEVEN)),
    ).toBe(false);
  });

  it("keeps an Ace and a King apart unless it wraps", () => {
    const ace = card(Suit.SPADE, Rank.ACE);
    const king = card(Suit.HEART, Rank.KING);

    expect([
      isAdjacentRank(false)(ace, king),
      isAdjacentRank(true)(ace, king),
      isAdjacentRank(true)(king, ace),
    ]).toEqual([false, true, true]);
  });
});
