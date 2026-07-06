import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { BoardInputManager } from "@/game/render/scene/board/input/board_input_manager";
import { SolitaireGame } from "@/game/model/game/solitaire_game";
import { PlayingCardVisual } from "@/game/render/visual/card/playing_card_visual";
import { StockPileVisual } from "@/game/render/visual/pile/stock_pile_visual";
import { WastePileVisual } from "@/game/render/visual/pile/waste_pile_visual";
import { TableauPileVisual } from "@/game/render/visual/pile/tableau_pile_visual";
import { FoundationPileVisual } from "@/game/render/visual/pile/foundation_pile_visual";
import { BoardScene } from "@/game/render/scene/board/board_scene";
import {
  asSprite,
  createMockInput,
  createMockSprite,
  MockInput,
  MockSprite,
} from "@test/support/phaser_mocks";

vi.mock("phaser", async () => {
  const mocks = await import("@test/support/phaser_mocks");
  return mocks.geomPhaserMock();
});

describe("BoardInputManager", () => {
  let gameModel: SolitaireGame;
  let input: MockInput;
  let stockPile: StockPileVisual;
  let wastePile: WastePileVisual;
  let tableauPiles: TableauPileVisual[];
  let foundationPiles: FoundationPileVisual[];
  let boardScene: BoardScene;
  let inputManager: BoardInputManager;

  beforeEach(() => {
    vi.useFakeTimers();

    gameModel = new SolitaireGame();
    gameModel.startNewGame();

    input = createMockInput();
    stockPile = new StockPileVisual(gameModel.stock);
    wastePile = new WastePileVisual(gameModel.waste);
    foundationPiles = gameModel.foundations.map(
      (f) => new FoundationPileVisual(f),
    );
    tableauPiles = gameModel.tableaus.map((t) => new TableauPileVisual(t));

    boardScene = {
      input,
      gameModel,
      stockPile,
      wastePile,
      foundationPiles,
      tableauPiles,
      cardVisualsMap: new Map(),
    } as unknown as BoardScene;

    stockPile.sprite = asSprite(
      createMockSprite({ x: 40, y: 40, displayWidth: 220, displayHeight: 307 }),
    );

    inputManager = new BoardInputManager(boardScene);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Registers card listeners for a fresh sprite bound to the given card. */
  function listenTo(card = gameModel.tableaus[0].getCards()[0]): {
    sprite: MockSprite;
    visual: PlayingCardVisual;
  } {
    const visual = new PlayingCardVisual(card);
    const sprite = createMockSprite();
    visual.sprite = asSprite(sprite);
    inputManager.registerCardListeners(asSprite(sprite), visual);
    boardScene.cardVisualsMap.set(card.id, visual);
    return { sprite, visual };
  }

  describe("card hover", () => {
    it("marks a card as hovered on pointerover", () => {
      const { sprite, visual } = listenTo();

      sprite.emit("pointerover");

      expect(inputManager.hoveredCardVisual).toBe(visual);
    });

    it("clears the hovered card on pointerout when it is the hovered card", () => {
      const { sprite, visual } = listenTo();
      inputManager.hoveredCardVisual = visual;

      sprite.emit("pointerout");

      expect(inputManager.hoveredCardVisual).toBeNull();
    });

    it("leaves a different hovered card untouched on pointerout", () => {
      const { sprite, visual } = listenTo();
      const other = new PlayingCardVisual(gameModel.tableaus[1].getCards()[0]);
      inputManager.hoveredCardVisual = other;

      sprite.emit("pointerout");

      expect(inputManager.hoveredCardVisual).toBe(other);
    });
  });

  describe("stock interaction", () => {
    it("draws from the stock when the top stock card is clicked", () => {
      const drawSpy = vi.spyOn(gameModel, "drawCardsFromStock");
      const stock = gameModel.stock.getCards();
      const topCard = stock[stock.length - 1];
      const { sprite } = listenTo(topCard);

      sprite.emit("pointerdown");

      expect(drawSpy).toHaveBeenCalled();
    });

    it("does not draw when a non-top stock card is clicked", () => {
      const drawSpy = vi.spyOn(gameModel, "drawCardsFromStock");
      const stock = gameModel.stock.getCards();
      const belowTopCard = stock[stock.length - 2];
      const { sprite } = listenTo(belowTopCard);

      sprite.emit("pointerdown");

      expect(drawSpy).not.toHaveBeenCalled();
    });

    it("does not draw from the stock when a tableau card is clicked", () => {
      const drawSpy = vi.spyOn(gameModel, "drawCardsFromStock");
      const { sprite } = listenTo(gameModel.tableaus[0].getCards()[0]);

      sprite.emit("pointerdown");

      expect(drawSpy).not.toHaveBeenCalled();
    });

    it("throws when the clicked card is in no pile", () => {
      const card = gameModel.tableaus[0].getCards()[0];
      gameModel.tableaus[0].removeCard(card);
      const { sprite } = listenTo(card);

      expect(() => sprite.emit("pointerdown")).toThrow("is not in a pile");
    });
  });

  describe("double click", () => {
    it("auto-moves a tableau card to a foundation on double click", () => {
      const autoMoveSpy = vi.spyOn(gameModel, "autoMoveCard");
      const card = gameModel.tableaus[0].getCards()[0];
      const { sprite } = listenTo(card);

      sprite.emit("pointerdown");
      sprite.emit("pointerdown");

      expect(autoMoveSpy).toHaveBeenCalledWith(card.id);
    });

    it("leaves the card in place on a single click", () => {
      const autoMoveSpy = vi.spyOn(gameModel, "autoMoveCard");
      const card = gameModel.tableaus[0].getCards()[0];
      const { sprite } = listenTo(card);

      sprite.emit("pointerdown");

      expect(autoMoveSpy).not.toHaveBeenCalled();
    });

    it("does not auto-move when the clicks are more than 350ms apart", () => {
      const autoMoveSpy = vi.spyOn(gameModel, "autoMoveCard");
      const card = gameModel.tableaus[0].getCards()[0];
      const { sprite } = listenTo(card);

      sprite.emit("pointerdown");
      vi.advanceTimersByTime(351);
      sprite.emit("pointerdown");

      expect(autoMoveSpy).not.toHaveBeenCalled();
    });

    it("does not auto-move when the two clicks are on different cards", () => {
      const autoMoveSpy = vi.spyOn(gameModel, "autoMoveCard");
      const c1 = gameModel.tableaus[0].getCards()[0];
      const c2 = gameModel.tableaus[1].getCards()[0];
      const { sprite: s1 } = listenTo(c1);
      const { sprite: s2 } = listenTo(c2);

      s1.emit("pointerdown");
      s2.emit("pointerdown");

      expect(autoMoveSpy).not.toHaveBeenCalled();
    });

    it("does not auto-move stock cards on double click", () => {
      const autoMoveSpy = vi.spyOn(gameModel, "autoMoveCard");
      const card = gameModel.stock.getCards()[0];
      const { sprite } = listenTo(card);

      sprite.emit("pointerdown");
      sprite.emit("pointerdown");

      expect(autoMoveSpy).not.toHaveBeenCalled();
    });
  });

  describe("stock background", () => {
    let stockBackground: MockSprite;

    beforeEach(() => {
      stockBackground = createMockSprite();
      inputManager.registerStockBackgroundListeners(asSprite(stockBackground));
    });

    it("recycles the waste when the empty stock background is clicked", () => {
      gameModel.stock.clear();
      const drawSpy = vi.spyOn(gameModel, "drawCardsFromStock");

      stockBackground.emit("pointerdown");

      expect(drawSpy).toHaveBeenCalled();
    });

    it("does nothing when the stock is not empty", () => {
      const drawSpy = vi.spyOn(gameModel, "drawCardsFromStock");

      stockBackground.emit("pointerdown");

      expect(drawSpy).not.toHaveBeenCalled();
    });

    it("marks the stock background hovered on pointerover", () => {
      stockBackground.emit("pointerover");

      expect(inputManager.isStockBackgroundHovered).toBe(true);
    });

    it("clears the stock background hover on pointerout", () => {
      inputManager.isStockBackgroundHovered = true;

      stockBackground.emit("pointerout");

      expect(inputManager.isStockBackgroundHovered).toBe(false);
    });
  });

  describe("dragging", () => {
    let sprite: MockSprite;
    let cardVisual: PlayingCardVisual;

    beforeEach(() => {
      const cards = gameModel.tableaus[0].getCards();
      cardVisual = new PlayingCardVisual(cards[cards.length - 1]);
      sprite = createMockSprite({ x: 100, y: 150 });
      sprite.setData("cardVisual", cardVisual);
      cardVisual.sprite = asSprite(sprite);
      boardScene.cardVisualsMap.set(cardVisual.playingCard.id, cardVisual);
      inputManager.registerDragListeners();
    });

    it("captures the dragged stack on dragstart", () => {
      input.emit("dragstart", {}, asSprite(sprite));

      expect(inputManager.draggedStack).toEqual([cardVisual]);
      expect(inputManager.draggedStackOffsets).toEqual([{ x: 0, y: 0 }]);
      expect(inputManager.drag?.cardIds).toEqual([cardVisual.playingCard.id]);
    });

    it("does not start a drag when the sprite has no card visual", () => {
      const dummy = createMockSprite();

      input.emit("dragstart", {}, asSprite(dummy));

      expect(inputManager.draggedStack).toEqual([]);
    });

    it("does not start a drag when the card is in no model pile", () => {
      gameModel.tableaus[0].removeCard(cardVisual.playingCard);

      input.emit("dragstart", {}, asSprite(sprite));

      expect(inputManager.draggedStack).toEqual([]);
    });

    it("moves the whole stack relative to the primary card on drag", () => {
      const followerVisual = new PlayingCardVisual(
        gameModel.tableaus[0].getCards()[0],
      );
      const followerSprite = createMockSprite({ x: 100, y: 180 });
      followerVisual.sprite = asSprite(followerSprite);
      boardScene.cardVisualsMap.set(
        followerVisual.playingCard.id,
        followerVisual,
      );

      input.emit("dragstart", {}, asSprite(sprite));
      input.emit("drag", {}, asSprite(sprite), 200, 300);

      expect(inputManager.drag?.primary).toEqual({ x: 200, y: 300 });
    });

    it("ignores drag events when nothing is being dragged", () => {
      input.emit("drag", {}, asSprite(sprite), 200, 300);

      expect(inputManager.drag).toBeNull();
    });

    it("ignores dragend when nothing is being dragged", () => {
      expect(() => input.emit("dragend", {}, asSprite(sprite))).not.toThrow();
    });

    it("snaps back on dragend when the sprite has no card visual", () => {
      input.emit("dragstart", {}, asSprite(sprite));
      const dummy = createMockSprite();

      input.emit("dragend", {}, asSprite(dummy));

      expect(inputManager.draggedStack).toEqual([]);
      expect(inputManager.drag).toBeNull();
    });

    it("moves the card when dropped on a valid target pile", () => {
      // tableau-1 calculated layout origin: x: 348, y: 447
      sprite.setPosition(350, 450);
      const moveSpy = vi
        .spyOn(gameModel, "moveCardToPile")
        .mockReturnValue(true);
      input.emit("dragstart", {}, asSprite(sprite));

      input.emit("dragend", {}, asSprite(sprite));

      expect(moveSpy).toHaveBeenCalledWith(
        cardVisual.playingCard.id,
        "tableau-1",
      );
      expect(inputManager.draggedStack).toEqual([]);
    });

    it("snaps back when dropped on a target but the move is rejected", () => {
      sprite.setPosition(350, 450);
      vi.spyOn(gameModel, "moveCardToPile").mockReturnValue(false);
      input.emit("dragstart", {}, asSprite(sprite));

      input.emit("dragend", {}, asSprite(sprite));

      expect(inputManager.drag).toBeNull();
      expect(inputManager.draggedStack).toEqual([]);
    });

    it("snaps back without moving when dropped away from every pile", () => {
      sprite.setPosition(9000, 9000);
      const moveSpy = vi.spyOn(gameModel, "moveCardToPile");
      input.emit("dragstart", {}, asSprite(sprite));

      input.emit("dragend", {}, asSprite(sprite));

      expect(moveSpy).not.toHaveBeenCalled();
      expect(inputManager.drag).toBeNull();
      expect(inputManager.draggedStack).toEqual([]);
    });
  });
});
