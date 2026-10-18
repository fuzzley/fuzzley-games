import { describe, it, expect } from "vitest";
import {
  ALL_PLAYING_CARD_IDS,
  deckCardIds,
  STANDARD_52_CARD_DECK,
} from "@/engine/core/card/deck";
import {
  ALL_RANKS,
  ALL_SUITS,
  playingCardFaceKey,
  playingCardInstanceId,
  Rank,
  Suit,
} from "@/engine/core/card/playing_card";

describe("ALL_PLAYING_CARD_IDS", () => {
  it("covers a full standard deck", () => {
    expect(ALL_PLAYING_CARD_IDS.length).toBe(52);
  });

  it("holds no duplicate identities", () => {
    const ids = ALL_PLAYING_CARD_IDS.map(playingCardFaceKey);

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
      ALL_RANKS.map((rank) => ({ suit: Suit.SPADE, rank, deckIndex: 0 })),
    );
  });

  it("puts every card in deck zero", () => {
    const deckIndices = new Set(
      ALL_PLAYING_CARD_IDS.map((card) => card.deckIndex),
    );

    expect(deckIndices).toEqual(new Set([0]));
  });
});

describe("deckCardIds", () => {
  it("deals one standard deck by default", () => {
    const ids = deckCardIds();

    expect(ids.length).toBe(52);
  });

  it("repeats the whole card set once per copy", () => {
    const ids = deckCardIds({ ...STANDARD_52_CARD_DECK, copies: 2 });

    expect(ids.length).toBe(104);
  });

  it("gives each copy its own deck index", () => {
    const ids = deckCardIds({ ...STANDARD_52_CARD_DECK, copies: 2 });

    expect(new Set(ids.map((card) => card.deckIndex))).toEqual(new Set([0, 1]));
  });

  it("names duplicate cards distinctly, so a two-deck game can tell them apart", () => {
    const ids = deckCardIds({ ...STANDARD_52_CARD_DECK, copies: 2 });

    expect(new Set(ids.map(playingCardInstanceId)).size).toBe(104);
  });

  it("draws duplicate cards from one face, so both copies look alike", () => {
    const ids = deckCardIds({ ...STANDARD_52_CARD_DECK, copies: 2 });

    expect(new Set(ids.map(playingCardFaceKey)).size).toBe(52);
  });

  it("restricts the suits in play when asked, as one-suit Spider does", () => {
    const ids = deckCardIds({
      suits: [Suit.SPADE],
      ranks: ALL_RANKS,
      copies: 8,
    });

    expect(ids.length).toBe(104);
  });

  it("yields no cards for a deck with no copies", () => {
    const ids = deckCardIds({ ...STANDARD_52_CARD_DECK, copies: 0 });

    expect(ids).toEqual([]);
  });

  it("restricts the ranks in play when asked", () => {
    const ids = deckCardIds({
      suits: ALL_SUITS,
      ranks: [Rank.ACE, Rank.KING],
      copies: 1,
    });

    expect(ids.length).toBe(8);
  });
});
