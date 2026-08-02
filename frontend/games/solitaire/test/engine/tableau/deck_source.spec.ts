import { describe, it, expect, beforeEach } from "vitest";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { Rank, Suit } from "@/engine/core/card/playing_card";
import { DeckSource } from "@/engine/tableau/deck_source";
import { sequenceRandom } from "../../support/sequence_random";

describe("DeckSource", () => {
  let registry: CardRegistry;

  beforeEach(() => {
    registry = new CardRegistry();
  });

  describe("register", () => {
    it("returns one card per identity it was given", () => {
      const deck = new DeckSource(registry, ALL_PLAYING_CARD_IDS);

      expect(deck.register().length).toBe(52);
    });

    it("returns the same persistent instance on every call", () => {
      const deck = new DeckSource(registry, ALL_PLAYING_CARD_IDS);

      const first = deck.register();
      const second = deck.register();

      expect(second[0]).toBe(first[0]);
    });

    it("returns a fresh array, so shuffling it cannot disturb the registry", () => {
      const deck = new DeckSource(registry, ALL_PLAYING_CARD_IDS);

      const first = deck.register();
      first.length = 0;

      expect(deck.register().length).toBe(52);
    });

    it("registers every card for later lookup by id", () => {
      const deck = new DeckSource(registry, ALL_PLAYING_CARD_IDS);

      const allRegistered = deck
        .register()
        .every((card) => registry.get(card.id) === card);
      expect(allRegistered).toBe(true);
    });
  });

  describe("the side a deck deals", () => {
    it("buries the deal face down by default", () => {
      const deck = new DeckSource(registry, ALL_PLAYING_CARD_IDS);

      expect(deck.register().every((card) => !card.faceUp)).toBe(true);
    });

    it("deals face up when the game has no hidden information", () => {
      const deck = new DeckSource(
        registry,
        ALL_PLAYING_CARD_IDS,
        Math.random,
        true,
      );

      expect(deck.register().every((card) => card.faceUp)).toBe(true);
    });

    /*
     * What a restart depends on: the previous deal turned some of these over,
     * and the deal about to happen decides for itself which ones show.
     */
    it("turns cards left face up by a previous deal back down", () => {
      const deck = new DeckSource(registry, ALL_PLAYING_CARD_IDS);
      const cards = deck.register();
      cards[0].faceUp = true;

      deck.reset(cards);

      expect(cards.every((card) => !card.faceUp)).toBe(true);
    });
  });

  describe("createShuffledDeck", () => {
    it("returns every card the deck holds", () => {
      const deck = new DeckSource(registry, ALL_PLAYING_CARD_IDS);

      expect(deck.createShuffledDeck().length).toBe(52);
    });

    it("orders the deck by the randomness it was given", () => {
      const ordered = new DeckSource(registry, ALL_PLAYING_CARD_IDS).register();
      const deck = new DeckSource(
        new CardRegistry(),
        ALL_PLAYING_CARD_IDS,
        sequenceRandom([0]),
      );

      const shuffled = deck.createShuffledDeck();

      expect(shuffled.map((c) => c.id)).not.toEqual(ordered.map((c) => c.id));
    });

    it("deals nothing from an empty deck", () => {
      const deck = new DeckSource(registry, []);

      expect(deck.createShuffledDeck()).toEqual([]);
    });
  });

  describe("find", () => {
    it("returns the registered card for an identity the deck deals", () => {
      const deck = new DeckSource(registry, ALL_PLAYING_CARD_IDS);
      deck.register();

      const card = deck.find({ suit: Suit.SPADE, rank: Rank.ACE });

      expect(card?.suit).toBe(Suit.SPADE);
      expect(card?.rank).toBe(Rank.ACE);
    });

    it("returns undefined for a card a short deck does not hold", () => {
      const deck = new DeckSource(registry, ALL_PLAYING_CARD_IDS.slice(0, 2));
      deck.register();

      expect(deck.find({ suit: Suit.CLUB, rank: Rank.KING })).toBeUndefined();
    });
  });

  describe("size", () => {
    it("reports how many distinct cards the deck deals", () => {
      const deck = new DeckSource(registry, ALL_PLAYING_CARD_IDS.slice(0, 7));

      expect(deck.size).toBe(7);
    });
  });
});
