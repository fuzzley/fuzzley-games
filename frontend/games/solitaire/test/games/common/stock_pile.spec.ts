import { describe, it, expect, beforeEach } from "vitest";
import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { drawToWaste, recycleWasteToStock } from "@/games/common/stock_pile";
import { makePlayingCard } from "@test/support/card_builder";

/** The ids of a pile's cards, bottom-first. */
function idsIn(pile: CardPile<PlayingCard>): string[] {
  return pile.getCards().map((card) => card.id);
}

/** Whether every card in a pile is lying the given way up. */
function allFaceUp(pile: CardPile<PlayingCard>, faceUp: boolean): boolean {
  return pile.getCards().every((card) => card.faceUp === faceUp);
}

describe("stock and waste", () => {
  let stock: CardPile<PlayingCard>;
  let waste: CardPile<PlayingCard>;

  beforeEach(() => {
    stock = new CardPile<PlayingCard>("stock");
    waste = new CardPile<PlayingCard>("waste");
  });

  /**
   * Fills the stock with `count` face-down cards named `card-0` upwards,
   * bottom-first — so the highest-numbered card is the one on top.
   */
  function fillStock(count: number): void {
    for (let index = 0; index < count; index++) {
      stock.addCard(makePlayingCard({ id: `card-${index}` }));
    }
  }

  /**
   * Fills the waste with `count` face-up cards named `waste-0` upwards,
   * bottom-first — named apart from the stock's so a test that has both can
   * say which pile a card came from.
   */
  function fillWaste(count: number): void {
    for (let index = 0; index < count; index++) {
      waste.addCard(makePlayingCard({ id: `waste-${index}`, faceUp: true }));
    }
  }

  describe("drawToWaste", () => {
    it("moves the asked-for number of cards onto the waste", () => {
      fillStock(10);

      drawToWaste(stock, waste, 3);

      expect([stock.size, waste.size]).toEqual([7, 3]);
    });

    it("turns everything it draws face up", () => {
      fillStock(10);

      drawToWaste(stock, waste, 3);

      expect(allFaceUp(waste, true)).toBe(true);
    });

    it("draws off the top, leaving the last card drawn on top of the waste", () => {
      fillStock(5);

      drawToWaste(stock, waste, 3);

      expect(idsIn(waste)).toEqual(["card-4", "card-3", "card-2"]);
    });

    it("keeps the cards already on the waste beneath the new ones", () => {
      fillStock(2);
      fillWaste(1);

      drawToWaste(stock, waste, 1);

      expect(idsIn(waste)).toEqual(["waste-0", "card-1"]);
    });

    it("draws out a stock holding less than a full turn", () => {
      fillStock(2);

      drawToWaste(stock, waste, 3);

      expect([stock.isEmpty, waste.size]).toEqual([true, 2]);
    });

    it("draws nothing from an empty stock", () => {
      const transfers = drawToWaste(stock, waste, 3);

      expect([transfers, waste.size]).toEqual([[], 0]);
    });

    it("draws nothing when asked for no cards", () => {
      fillStock(5);

      const transfers = drawToWaste(stock, waste, 0);

      expect([transfers, stock.size]).toEqual([[], 5]);
    });

    it("reports the drawn cards in the order they sat in the stock", () => {
      fillStock(5);

      const transfers = drawToWaste(stock, waste, 3);

      // Bottom-first, which is the opposite of the order they were drawn in:
      // a transfer records where cards came *from*, so undo can re-append them
      // and get the original stock back.
      expect(transfers).toEqual([
        {
          cardIds: ["card-2", "card-3", "card-4"],
          fromPileId: "stock",
          toPileId: "waste",
          faceUpBefore: false,
        },
      ]);
    });
  });

  describe("recycleWasteToStock", () => {
    it("moves the whole waste back onto the stock", () => {
      fillWaste(4);

      recycleWasteToStock(waste, stock);

      expect([waste.isEmpty, stock.size]).toEqual([true, 4]);
    });

    it("turns everything it recycles face down", () => {
      fillWaste(4);

      recycleWasteToStock(waste, stock);

      expect(allFaceUp(stock, false)).toBe(true);
    });

    it("turns the waste over, so its bottom card ends up on top of the stock", () => {
      fillWaste(3);

      recycleWasteToStock(waste, stock);

      expect(idsIn(stock)).toEqual(["waste-2", "waste-1", "waste-0"]);
    });

    it("recycles nothing from an empty waste", () => {
      const transfers = recycleWasteToStock(waste, stock);

      expect([transfers, stock.size]).toEqual([[], 0]);
    });

    it("reports the recycled cards in the order they sat in the waste", () => {
      fillWaste(3);

      const transfers = recycleWasteToStock(waste, stock);

      expect(transfers).toEqual([
        {
          cardIds: ["waste-0", "waste-1", "waste-2"],
          fromPileId: "waste",
          toPileId: "stock",
          faceUpBefore: true,
        },
      ]);
    });
  });

  it("gives the stock back in its original order once drawn out and recycled", () => {
    fillStock(6);
    const dealt = idsIn(stock);

    drawToWaste(stock, waste, 3);
    drawToWaste(stock, waste, 3);
    recycleWasteToStock(waste, stock);

    // Both reversals cancel, which is the whole reason a player can go round
    // the stock twice and see the same cards in the same order.
    expect([idsIn(stock), allFaceUp(stock, false)]).toEqual([dealt, true]);
  });
});
