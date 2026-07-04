import { vi } from "vitest";
import * as Phaser from "phaser";
import { CardPile } from "@/game/model/card/card_pile";
import { PlayingCard } from "@/game/model/card/playing_card";
import { PlayingCardVisual } from "@/game/render/visual/card/playing_card_visual";
import { StockPileVisual } from "@/game/render/visual/pile/stock_pile_visual";
import { WastePileVisual } from "@/game/render/visual/pile/waste_pile_visual";
import { FoundationPileVisual } from "@/game/render/visual/pile/foundation_pile_visual";
import { TableauPileVisual } from "@/game/render/visual/pile/tableau_pile_visual";
import { Visual } from "@/game/render/visual/visual";

describe("Visual classes", () => {
  describe("Visual Base Class", () => {
    it("can set and get sprite", () => {
      const visual = new Visual();
      const mockSprite = {
        setPosition: vi.fn(),
      } as unknown as Phaser.GameObjects.Sprite;
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
    });

    it("can set and get position", () => {
      const playingCard = new PlayingCard();
      playingCard.id = "c1";
      const visual = new PlayingCardVisual(playingCard);

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
    });

    it("can set and get position", () => {
      const cardPile = new CardPile();
      const visual = new StockPileVisual(cardPile);

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

    it("stacks cards below the fan at the origin when cards count exceeds MAX_FAN_CARDS", () => {
      const card1 = new PlayingCard();
      card1.id = "c1";
      const card2 = new PlayingCard();
      card2.id = "c2";
      const card3 = new PlayingCard();
      card3.id = "c3";
      const card4 = new PlayingCard();
      card4.id = "c4";

      const v1 = new PlayingCardVisual(card1);
      const v2 = new PlayingCardVisual(card2);
      const v3 = new PlayingCardVisual(card3);
      const v4 = new PlayingCardVisual(card4);

      const visual = new WastePileVisual(new CardPile(), [v1, v2, v3, v4]);
      visual.layoutPile();

      // Card 1 is below the fan (count = 4, MAX_FAN_CARDS = 3, fanStartIndex = 1)
      expect(v1.position).toEqual({ x: 0, y: 0 });
      // Card 2, 3, 4 are fanned
      expect(v2.position).toEqual({ x: 0, y: 0 });
      expect(v3.position).toEqual({ x: 25, y: 0 });
      expect(v4.position).toEqual({ x: 50, y: 0 });
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
      // v1 is face-down => offset is 18px => v2 y is 18
      expect(v2.position).toEqual({ x: 0, y: 18 });
      // v2 is face-up => offset is 45px => v3 y is 18 + 45 = 63
      expect(v3.position).toEqual({ x: 0, y: 63 });
    });
  });
});
