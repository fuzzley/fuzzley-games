import { CardPile } from "../../src/model/card/card_pile";
import { PlayingCard } from "../../src/model/card/playing_card";
import { PlayingCardVisual } from "../../src/render/visual/card/playing_card_visual";
import { StockPileVisual } from "../../src/render/visual/pile/stock_pile_visual";
import { WastePileVisual } from "../../src/render/visual/pile/waste_pile_visual";
import { FoundationPileVisual } from "../../src/render/visual/pile/foundation_pile_visual";
import { TableauPileVisual } from "../../src/render/visual/pile/tableau_pile_visual";
import { Visual } from "../../src/render/visual/visual";

describe("Visual classes", () => {
  describe("Visual Base Class", () => {
    it("can set and get sprite", () => {
      const visual = new Visual();
      const mockSprite = { setPosition: vi.fn() } as any;
      visual.sprite = mockSprite;
      expect(visual.sprite).toBe(mockSprite);
    });
  });

  describe("PlayingCardVisual", () => {
    it("can be created and extends Visual", () => {
      const playingCard = new PlayingCard();
      playingCard.id = "c1";
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

    it("lays out cards stacked on top of each other", () => {
      const card1 = new PlayingCard();
      card1.id = "c1";
      const card2 = new PlayingCard();
      card2.id = "c2";
      const v1 = new PlayingCardVisual(card1);
      const v2 = new PlayingCardVisual(card2);
      const visual = new StockPileVisual(new CardPile(), [v1, v2]);

      visual.layoutPile();
      expect(v1.position).toEqual({ x: 0, y: 0 });
      expect(v2.position).toEqual({ x: 0, y: 0 });
    });
  });

  describe("WastePileVisual", () => {
    it("can be created and extends Visual", () => {
      const cardPile = new CardPile();
      const visual = new WastePileVisual(cardPile);

      expect(visual).toBeInstanceOf(Visual);
      expect(visual.value).toBe(cardPile);
      expect(visual.position).toEqual({ x: 0, y: 0 });
    });

    it("fans out topmost cards horizontally", () => {
      const card1 = new PlayingCard();
      card1.id = "c1";
      const card2 = new PlayingCard();
      card2.id = "c2";
      const v1 = new PlayingCardVisual(card1);
      const v2 = new PlayingCardVisual(card2);
      const visual = new WastePileVisual(new CardPile(), [v1, v2]);

      visual.layoutPile();
      expect(v1.position).toEqual({ x: 0, y: 0 });
      expect(v2.position).toEqual({ x: 25, y: 0 });
    });
  });

  describe("FoundationPileVisual", () => {
    it("can be created and extends Visual", () => {
      const cardPile = new CardPile();
      const visual = new FoundationPileVisual(cardPile);

      expect(visual).toBeInstanceOf(Visual);
      expect(visual.value).toBe(cardPile);
    });

    it("lays out cards stacked on top of each other", () => {
      const card1 = new PlayingCard();
      card1.id = "c1";
      const card2 = new PlayingCard();
      card2.id = "c2";
      const v1 = new PlayingCardVisual(card1);
      const v2 = new PlayingCardVisual(card2);
      const visual = new FoundationPileVisual(new CardPile(), [v1, v2]);

      visual.layoutPile();
      expect(v1.position).toEqual({ x: 0, y: 0 });
      expect(v2.position).toEqual({ x: 0, y: 0 });
    });
  });

  describe("TableauPileVisual", () => {
    it("can be created and extends Visual", () => {
      const cardPile = new CardPile();
      const visual = new TableauPileVisual(cardPile);

      expect(visual).toBeInstanceOf(Visual);
      expect(visual.value).toBe(cardPile);
    });

    it("fans out face-down cards closer together and face-up cards further apart", () => {
      const card1 = new PlayingCard();
      card1.id = "c1";
      card1.faceUp = false;
      const card2 = new PlayingCard();
      card2.id = "c2";
      card2.faceUp = true;
      const card3 = new PlayingCard();
      card3.id = "c3";
      card3.faceUp = false;

      const v1 = new PlayingCardVisual(card1);
      const v2 = new PlayingCardVisual(card2);
      const v3 = new PlayingCardVisual(card3);

      const visual = new TableauPileVisual(new CardPile(), [v1, v2, v3]);

      visual.layoutPile();
      // v1 is first (index 0) => y is 0
      expect(v1.position).toEqual({ x: 0, y: 0 });
      // v1 is face-down => offset is 15px => v2 y is 15
      expect(v2.position).toEqual({ x: 0, y: 15 });
      // v2 is face-up => offset is 35px => v3 y is 15 + 35 = 50
      expect(v3.position).toEqual({ x: 0, y: 50 });
    });
  });
});
