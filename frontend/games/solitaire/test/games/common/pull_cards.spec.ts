import { describe, it, expect } from "vitest";
import { PlayingCard, Rank } from "@/engine/core/card/playing_card";
import { pullCards, pullFirstCard } from "@/games/common/pull_cards";
import { makePlayingCard } from "@test/support/card_builder";

/** Returns a deck of the given ranks, bottom first, each named for its place. */
function deckOf(...ranks: Rank[]): PlayingCard[] {
  return ranks.map((rank, index) =>
    makePlayingCard({ id: `card-${index}`, rank }),
  );
}

/** Returns whether a card is an Ace. */
function isAce(card: PlayingCard): boolean {
  return card.rank === Rank.ACE;
}

describe("pullCards", () => {
  it("returns the matching cards in the order the deal reaches them", () => {
    const deck = deckOf(Rank.ACE, Rank.FIVE, Rank.ACE, Rank.NINE);

    const pulled = pullCards(deck, isAce);

    expect(pulled.map((card) => card.id)).toEqual(["card-2", "card-0"]);
  });

  it("leaves the rest of the deck in its order", () => {
    const deck = deckOf(Rank.ACE, Rank.FIVE, Rank.ACE, Rank.NINE);

    pullCards(deck, isAce);

    expect(deck.map((card) => card.rank)).toEqual([Rank.FIVE, Rank.NINE]);
  });

  it("returns nothing and leaves the deck alone when nothing matches", () => {
    const deck = deckOf(Rank.FIVE, Rank.NINE);

    const pulled = pullCards(deck, isAce);

    expect([pulled, deck.length]).toEqual([[], 2]);
  });
});

describe("pullFirstCard", () => {
  it("returns the first matching card the deal reaches", () => {
    const deck = deckOf(Rank.ACE, Rank.FIVE, Rank.ACE, Rank.NINE);

    const pulled = pullFirstCard(deck, isAce);

    expect(pulled?.id).toBe("card-2");
  });

  it("leaves every other card in the deck, in its order", () => {
    const deck = deckOf(Rank.ACE, Rank.FIVE, Rank.ACE, Rank.NINE);

    pullFirstCard(deck, isAce);

    expect(deck.map((card) => card.id)).toEqual(["card-0", "card-1", "card-3"]);
  });

  it("returns nothing when nothing matches", () => {
    const deck = deckOf(Rank.FIVE, Rank.NINE);

    expect(pullFirstCard(deck, isAce)).toBeUndefined();
  });
});
