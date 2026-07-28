import { describe, it, expect } from "vitest";
import {
  ALL_RANKS,
  PlayingCard,
  playingCardFaceKey,
  playingCardInstanceId,
  rankAbove,
  rankBelow,
  Rank,
  Suit,
} from "@/engine/core/card/playing_card";

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

describe("playingCardFaceKey", () => {
  it("maps a suit and rank to its canonical artwork key", () => {
    const id = playingCardFaceKey({ suit: Suit.HEART, rank: Rank.QUEEN });

    expect(id).toBe("card-hearts-queen");
  });

  it("throws for an unknown suit", () => {
    expect(() =>
      playingCardFaceKey({ suit: 999 as Suit, rank: Rank.ACE }),
    ).toThrow("Unknown Suit: 999");
  });

  it("throws for an unknown rank", () => {
    expect(() =>
      playingCardFaceKey({ suit: Suit.SPADE, rank: 999 as Rank }),
    ).toThrow("Unknown Rank: 999");
  });
});

describe("playingCardInstanceId", () => {
  it("names a deck-zero card by its face alone", () => {
    const id = playingCardInstanceId({ suit: Suit.HEART, rank: Rank.QUEEN });

    expect(id).toBe("card-hearts-queen");
  });

  it("treats an omitted deck index as deck zero", () => {
    const implicit = playingCardInstanceId({
      suit: Suit.HEART,
      rank: Rank.QUEEN,
    });

    expect(implicit).toBe(
      playingCardInstanceId({
        suit: Suit.HEART,
        rank: Rank.QUEEN,
        deckIndex: 0,
      }),
    );
  });

  it("suffixes a card from a later deck", () => {
    const id = playingCardInstanceId({
      suit: Suit.HEART,
      rank: Rank.QUEEN,
      deckIndex: 1,
    });

    expect(id).toBe("card-hearts-queen#1");
  });
});

describe("PlayingCard", () => {
  it("derives its face key from its own suit and rank", () => {
    const card = new PlayingCard("anything", Suit.DIAMOND, Rank.THREE);

    expect(card.faceKey).toBe("card-diamonds-3");
  });

  it("keeps a face key it was handed, so a duplicate can share one face", () => {
    const card = new PlayingCard(
      "card-diamonds-3#1",
      Suit.DIAMOND,
      Rank.THREE,
      false,
      "card-diamonds-3",
    );

    expect(card.faceKey).toBe("card-diamonds-3");
  });
});
