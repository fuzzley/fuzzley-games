import { describe, it, expect, beforeEach } from "vitest";
import { Dealer } from "@/games/klondike/dealer";
import { CardRegistry } from "@/engine/core/card/card_registry";
import {
  CardPile,
  PileType,
  FOUNDATION_COUNT,
  TABLEAU_COUNT,
  foundationPileId,
  tableauPileId,
} from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

describe("Dealer", () => {
  let registry: CardRegistry;
  let dealer: Dealer;
  let stock: CardPile<PlayingCard>;
  let tableaus: CardPile<PlayingCard>[];
  let foundations: CardPile<PlayingCard>[];

  beforeEach(() => {
    registry = new CardRegistry();
    dealer = new Dealer(registry);
    stock = new CardPile<PlayingCard>("stock", PileType.STOCK);
    tableaus = Array.from(
      { length: TABLEAU_COUNT },
      (_, i) => new CardPile<PlayingCard>(tableauPileId(i), PileType.TABLEAU),
    );
    foundations = Array.from(
      { length: FOUNDATION_COUNT },
      (_, i) =>
        new CardPile<PlayingCard>(foundationPileId(i), PileType.FOUNDATION),
    );
  });

  describe("createShuffledDeck", () => {
    it("returns a full 52-card deck", () => {
      expect(dealer.createShuffledDeck().length).toBe(52);
    });

    it("returns every card face down", () => {
      const allFaceDown = dealer.createShuffledDeck().every((c) => !c.faceUp);

      expect(allFaceDown).toBe(true);
    });

    it("registers every dealt card for later lookup", () => {
      const deck = dealer.createShuffledDeck();

      const allRegistered = deck.every((c) => registry.get(c.id) === c);
      expect(allRegistered).toBe(true);
    });

    it("deals nothing from an empty deck", () => {
      const emptyDealer = new Dealer(registry, []);

      expect(emptyDealer.createShuffledDeck()).toEqual([]);
    });
  });

  describe("dealOpeningLayout", () => {
    it("deals an increasing number of cards to each tableau", () => {
      const deck = dealer.createShuffledDeck();

      dealer.dealOpeningLayout(deck, tableaus, stock);

      expect(tableaus.map((t) => t.getCards().length)).toEqual([
        1, 2, 3, 4, 5, 6, 7,
      ]);
    });

    it("leaves only the top card of each tableau face up", () => {
      const deck = dealer.createShuffledDeck();

      dealer.dealOpeningLayout(deck, tableaus, stock);

      const layout = tableaus.map((t) => t.getCards().map((c) => c.faceUp));
      expect(layout).toEqual([
        [true],
        [false, true],
        [false, false, true],
        [false, false, false, true],
        [false, false, false, false, true],
        [false, false, false, false, false, true],
        [false, false, false, false, false, false, true],
      ]);
    });

    it("puts the remaining cards face down on the stock", () => {
      const deck = dealer.createShuffledDeck();

      dealer.dealOpeningLayout(deck, tableaus, stock);

      expect(stock.getCards().length).toBe(24);
      expect(stock.getCards().every((c) => !c.faceUp)).toBe(true);
    });
  });

  describe("dealAlmostWin", () => {
    it("fills every foundation with Ace through Queen, face up", () => {
      dealer.dealAlmostWin(foundations, tableaus);

      expect(foundations.map((f) => f.getCards().length)).toEqual([
        12, 12, 12, 12,
      ]);
      const allFaceUp = foundations.every((f) =>
        f.getCards().every((c) => c.faceUp),
      );
      expect(allFaceUp).toBe(true);
    });

    it("seeds only the first four tableaus with a single King", () => {
      dealer.dealAlmostWin(foundations, tableaus);

      expect(tableaus.map((t) => t.getCards().length)).toEqual([
        1, 1, 1, 1, 0, 0, 0,
      ]);
    });
  });
});
