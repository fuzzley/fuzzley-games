import { CardPile } from "../../src/card/card_pile";
import { PlayingCard } from "../../src/card/playing_card";
import { PlayingCardVisual } from "../../src/visual/playing_card_visual";
import { StockPileVisual } from "../../src/visual/stock_pile_visual";
import { Visual } from "../../src/visual/visual";

describe("Visual classes", () => {
  describe("PlayingCardVisual", () => {
    it("can be created and extends Visual", () => {
      const playingCard = new PlayingCard();
      const visual = new PlayingCardVisual(playingCard);

      expect(visual).toBeInstanceOf(Visual);
      expect(visual.value).toBe(playingCard);
      expect(visual.position).toEqual({ x: 0, y: 0 });

      visual.position = { x: 100, y: 200 };
      expect(visual.position).toEqual({ x: 100, y: 200 });
    });
  });

  describe("StockPileVisual", () => {
    it("can be created and extends Visual", () => {
      const cardPile = new CardPile();
      const visual = new StockPileVisual(cardPile);

      expect(visual).toBeInstanceOf(Visual);
      expect(visual.value).toBe(cardPile);
      expect(visual.position).toEqual({ x: 0, y: 0 });

      visual.position = { x: 50, y: 75 };
      expect(visual.position).toEqual({ x: 50, y: 75 });
    });
  });
});
