import { describe, it, expect, beforeEach } from "vitest";
import {
  dealKlondikeAlmostWin,
  dealKlondikeLayout,
} from "@/games/klondike/klondike_deal";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { CardPile } from "@/engine/core/card/card_pile";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { DeckSource } from "@/engine/tableau/deck_source";
import {
  KlondikeRole,
  FOUNDATION_COUNT,
  TABLEAU_COUNT,
  foundationPileId,
  tableauPileId,
} from "@/games/klondike/klondike_zones";
import { PlayingCard } from "@/engine/core/card/playing_card";

describe("the Klondike deal", () => {
  let registry: CardRegistry;
  let deck: DeckSource;
  let stock: CardPile<PlayingCard>;
  let tableaus: CardPile<PlayingCard>[];
  let foundations: CardPile<PlayingCard>[];

  beforeEach(() => {
    registry = new CardRegistry();
    deck = new DeckSource(registry, ALL_PLAYING_CARD_IDS);
    stock = new CardPile<PlayingCard>("stock", KlondikeRole.STOCK);
    tableaus = Array.from(
      { length: TABLEAU_COUNT },
      (_, i) =>
        new CardPile<PlayingCard>(tableauPileId(i), KlondikeRole.TABLEAU),
    );
    foundations = Array.from(
      { length: FOUNDATION_COUNT },
      (_, i) =>
        new CardPile<PlayingCard>(foundationPileId(i), KlondikeRole.FOUNDATION),
    );
  });

  describe("dealKlondikeLayout", () => {
    it("deals an increasing number of cards to each tableau", () => {
      dealKlondikeLayout(deck.createShuffledDeck(), tableaus, stock);

      expect(tableaus.map((t) => t.getCards().length)).toEqual([
        1, 2, 3, 4, 5, 6, 7,
      ]);
    });

    it("leaves only the top card of each tableau face up", () => {
      dealKlondikeLayout(deck.createShuffledDeck(), tableaus, stock);

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
      dealKlondikeLayout(deck.createShuffledDeck(), tableaus, stock);

      expect(stock.getCards().length).toBe(24);
      expect(stock.getCards().every((c) => !c.faceUp)).toBe(true);
    });

    it("deals nothing at all from an empty deck", () => {
      const empty = new DeckSource(registry, []);

      dealKlondikeLayout(empty.createShuffledDeck(), tableaus, stock);

      expect(tableaus.every((t) => t.isEmpty)).toBe(true);
      expect(stock.isEmpty).toBe(true);
    });
  });

  describe("dealKlondikeAlmostWin", () => {
    it("fills every foundation with Ace through Queen, face up", () => {
      dealKlondikeAlmostWin(deck, foundations, tableaus);

      expect(foundations.map((f) => f.getCards().length)).toEqual([
        12, 12, 12, 12,
      ]);
      const allFaceUp = foundations.every((f) =>
        f.getCards().every((c) => c.faceUp),
      );
      expect(allFaceUp).toBe(true);
    });

    it("seeds only the first four tableaus with a single King", () => {
      dealKlondikeAlmostWin(deck, foundations, tableaus);

      expect(tableaus.map((t) => t.getCards().length)).toEqual([
        1, 1, 1, 1, 0, 0, 0,
      ]);
    });

    /*
     * A short deck has no King of Clubs to place, so the almost-win board is
     * simply smaller rather than the deal failing on a card it cannot find.
     */
    it("places only the cards a short deck actually holds", () => {
      const short = new DeckSource(registry, ALL_PLAYING_CARD_IDS.slice(0, 13));

      dealKlondikeAlmostWin(short, foundations, tableaus);

      const placed =
        foundations.reduce((total, pile) => total + pile.size, 0) +
        tableaus.reduce((total, pile) => total + pile.size, 0);
      expect(placed).toBe(13);
    });
  });
});
