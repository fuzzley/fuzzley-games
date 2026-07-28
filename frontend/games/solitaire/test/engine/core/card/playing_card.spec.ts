import { describe, it, expect } from "vitest";
import {
  ALL_PLAYING_CARD_IDS,
  ALL_RANKS,
  ALL_SUITS,
  playingCardIdToString,
  rankAbove,
  rankBelow,
  Rank,
  Suit,
} from "@/engine/core/card/playing_card";

describe("ALL_PLAYING_CARD_IDS", () => {
  it("covers a full standard deck", () => {
    expect(ALL_PLAYING_CARD_IDS.length).toBe(52);
  });

  it("holds no duplicate identities", () => {
    const ids = ALL_PLAYING_CARD_IDS.map(playingCardIdToString);

    expect(new Set(ids).size).toBe(52);
  });

  it("pairs every suit with every rank", () => {
    const pairs = new Set(
      ALL_PLAYING_CARD_IDS.map((card) => `${card.suit}:${card.rank}`),
    );

    const expected = ALL_SUITS.flatMap((suit) =>
      ALL_RANKS.map((rank) => `${suit}:${rank}`),
    );
    expect(pairs).toEqual(new Set(expected));
  });

  it("runs suit-major, so a suit's cards are contiguous and ascending", () => {
    const firstThirteen = ALL_PLAYING_CARD_IDS.slice(0, ALL_RANKS.length);

    expect(firstThirteen).toEqual(
      ALL_RANKS.map((rank) => ({ suit: Suit.SPADE, rank })),
    );
  });
});

describe("ALL_RANKS", () => {
  it("ascends from Ace to King in consecutive steps, as the build rules assume", () => {
    const steps = ALL_RANKS.slice(1).map(
      (rank, index) => rank - ALL_RANKS[index],
    );

    expect(steps).toEqual(Array(ALL_RANKS.length - 1).fill(1));
  });

  it("starts at Ace and ends at King", () => {
    expect([ALL_RANKS[0], ALL_RANKS[ALL_RANKS.length - 1]]).toEqual([
      Rank.ACE,
      Rank.KING,
    ]);
  });
});

describe("rankAbove", () => {
  it("steps up one rank", () => {
    expect(rankAbove(Rank.FIVE)).toBe(Rank.SIX);
  });

  it("has nothing above the King", () => {
    expect(rankAbove(Rank.KING)).toBeUndefined();
  });
});

describe("rankBelow", () => {
  it("steps down one rank", () => {
    expect(rankBelow(Rank.FIVE)).toBe(Rank.FOUR);
  });

  it("has nothing below the Ace", () => {
    expect(rankBelow(Rank.ACE)).toBeUndefined();
  });
});

describe("playingCardIdToString", () => {
  it("maps a suit and rank to its canonical id", () => {
    const id = playingCardIdToString({ suit: Suit.HEART, rank: Rank.QUEEN });

    expect(id).toBe("card-hearts-queen");
  });

  it("throws for an unknown suit", () => {
    expect(() =>
      playingCardIdToString({ suit: 999 as Suit, rank: Rank.ACE }),
    ).toThrow("Unknown Suit: 999");
  });

  it("throws for an unknown rank", () => {
    expect(() =>
      playingCardIdToString({ suit: Suit.SPADE, rank: 999 as Rank }),
    ).toThrow("Unknown Rank: 999");
  });
});
