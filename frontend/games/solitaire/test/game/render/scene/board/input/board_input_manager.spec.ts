import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { BoardInputManager } from "@/game/render/scene/board/input/board_input_manager";
import { SolitaireGame } from "@/game/model/game/solitaire_game";
import { PlayingCardVisual } from "@/game/render/visual/card/playing_card_visual";
import { StockPileVisual } from "@/game/render/visual/pile/stock_pile_visual";
import { WastePileVisual } from "@/game/render/visual/pile/waste_pile_visual";
import { TableauPileVisual } from "@/game/render/visual/pile/tableau_pile_visual";
import { FoundationPileVisual } from "@/game/render/visual/pile/foundation_pile_visual";
import { BoardScene, PileVisual } from "@/game/render/scene/board/board_scene";
import {
  asSprite,
  createMockInput,
  createMockSprite,
  MockInput,
  MockSprite,
} from "@test/support/phaser_mocks";

// The source computes drop overlaps with Phaser.Geom.Rectangle. Provide just
// that geometry so the real phaser module (which needs a browser environment)
// is not required in the node test environment.
vi.mock("phaser", async () => {
  const mocks = await import("@test/support/phaser_mocks");
  return mocks.geomPhaserMock();
});

describe("BoardInputManager", () => {
  let gameModel: SolitaireGame;
  let input: MockInput;
  let stockPile: StockPileVisual;
  let tableauPiles: TableauPileVisual[];
  let foundationPiles: FoundationPileVisual[];
  let getPileVisualById: ReturnType<typeof vi.fn>;
  let updateVisualLayout: ReturnType<typeof vi.fn>;
  let boardScene: BoardScene;
  let inputManager: BoardInputManager;

  beforeEach(() => {
    gameModel = new SolitaireGame();
    gameModel.startNewGame();

    input = createMockInput();
    stockPile = new StockPileVisual(gameModel.stock);
    const wastePile = new WastePileVisual(gameModel.waste);
    foundationPiles = gameModel.foundations.map(
      (f) => new FoundationPileVisual(f),
    );
    tableauPiles = gameModel.tableaus.map((t) => new TableauPileVisual(t));

    getPileVisualById = vi.fn((pileId: string): PileVisual | null => {
      if (pileId === "stock") return stockPile;
      if (pileId === "waste") return wastePile;
      if (pileId.startsWith("tableau-")) {
        return tableauPiles[Number(pileId.split("-")[1])];
      }
      if (pileId.startsWith("foundation-")) {
        return foundationPiles[Number(pileId.split("-")[1])];
      }
      return null;
    });
    updateVisualLayout = vi.fn();

    boardScene = {
      input,
      gameModel,
      stockPile,
      wastePile,
      foundationPiles,
      tableauPiles,
      getPileVisualById,
      updateHighlightBorder: vi.fn(),
      getLayoutManager: () => ({
        getScaleFactor: () => 1.0,
        updateVisualLayout,
      }),
    } as unknown as BoardScene;

    stockPile.sprite = asSprite(
      createMockSprite({ x: 40, y: 40, displayWidth: 220, displayHeight: 307 }),
    );

    inputManager = new BoardInputManager(boardScene);
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
      const { sprite } = listenTo();
      const otherVisual = new PlayingCardVisual(
        gameModel.tableaus[1].getCards()[0],
      );
      inputManager.hoveredCardVisual = otherVisual;

      sprite.emit("pointerout");

      expect(inputManager.hoveredCardVisual).toBe(otherVisual);
    });
  });

  describe("card pointerdown", () => {
    it("draws from the stock when the top stock card is clicked", () => {
      const stockCards = gameModel.stock.getCards();
      const { sprite } = listenTo(stockCards[stockCards.length - 1]);
      const initialStockSize = gameModel.stock.getCards().length;

      sprite.emit("pointerdown");

      expect(gameModel.stock.getCards().length).toBe(initialStockSize - 3);
      expect(gameModel.waste.getCards().length).toBe(3);
    });

    it("does not draw when a non-top stock card is clicked", () => {
      const { sprite } = listenTo(gameModel.stock.getCards()[0]);
      const initialStockSize = gameModel.stock.getCards().length;

      sprite.emit("pointerdown");

      expect(gameModel.stock.getCards().length).toBe(initialStockSize);
      expect(gameModel.waste.getCards().length).toBe(0);
    });

    it("does not draw from the stock when a tableau card is clicked", () => {
      const { sprite } = listenTo();
      const initialStockSize = gameModel.stock.getCards().length;

      sprite.emit("pointerdown");

      expect(gameModel.stock.getCards().length).toBe(initialStockSize);
      expect(gameModel.waste.getCards().length).toBe(0);
    });

    it("throws when the clicked card is in no pile", () => {
      const card = gameModel.tableaus[0].getCards()[0];
      const { sprite } = listenTo(card);
      gameModel.tableaus[0].removeCard(card);

      expect(() => sprite.emit("pointerdown")).toThrow(/is not in a pile/);
    });
  });

  describe("double click", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    /** Moves a card face-up onto the given tableau and returns it. */
    function placeOnTableau(cardId: string, tableauIndex: number) {
      const card = gameModel.getCardById(cardId)!;
      gameModel.getPileContainingCard(cardId)?.removeCard(card);
      card.faceUp = true;
      gameModel.tableaus[tableauIndex].addCard(card);
      return card;
    }

    it("auto-moves a tableau card to a foundation on double click", () => {
      const ace = placeOnTableau("card-clubs-ace", 0);
      const { sprite } = listenTo(ace);

      sprite.emit("pointerdown");
      vi.advanceTimersByTime(100);
      sprite.emit("pointerdown");

      expect(gameModel.foundations[0].getCards()).toContain(ace);
    });

    it("leaves the card in place on a single click", () => {
      const ace = placeOnTableau("card-clubs-ace", 0);
      const { sprite } = listenTo(ace);

      sprite.emit("pointerdown");

      expect(gameModel.tableaus[0].getCards()).toContain(ace);
    });

    it("does not auto-move when the clicks are more than 350ms apart", () => {
      const ace = placeOnTableau("card-clubs-ace", 0);
      const { sprite } = listenTo(ace);

      sprite.emit("pointerdown");
      vi.advanceTimersByTime(400);
      sprite.emit("pointerdown");

      expect(gameModel.tableaus[0].getCards()).toContain(ace);
    });

    it("does not auto-move when the two clicks are on different cards", () => {
      const ace = placeOnTableau("card-clubs-ace", 0);
      const other = placeOnTableau("card-spades-ace", 1);
      const { sprite: aceSprite } = listenTo(ace);
      const { sprite: otherSprite } = listenTo(other);

      otherSprite.emit("pointerdown");
      vi.advanceTimersByTime(100);
      aceSprite.emit("pointerdown");

      expect(gameModel.tableaus[0].getCards()).toContain(ace);
    });

    it("does not auto-move stock cards on double click", () => {
      const stockCards = gameModel.stock.getCards();
      const topStockCard = stockCards[stockCards.length - 1];
      const { sprite } = listenTo(topStockCard);

      sprite.emit("pointerdown");
      vi.advanceTimersByTime(100);
      sprite.emit("pointerdown");

      expect(gameModel.getPileContainingCard(topStockCard.id)).toBe(
        gameModel.waste,
      );
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
      const card = gameModel.getCardById("card-clubs-ace")!;
      gameModel.getPileContainingCard(card.id)?.removeCard(card);
      gameModel.waste.addCard(card);

      stockBackground.emit("pointerdown");

      expect(gameModel.stock.getCards().length).toBe(1);
      expect(gameModel.waste.getCards().length).toBe(0);
    });

    it("does nothing when the stock is not empty", () => {
      const initialStockSize = gameModel.stock.getCards().length;

      stockBackground.emit("pointerdown");

      expect(gameModel.stock.getCards().length).toBe(initialStockSize);
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
      cardVisual = new PlayingCardVisual(gameModel.tableaus[0].getCards()[0]);
      sprite = createMockSprite({ x: 100, y: 150 });
      sprite.setData("cardVisual", cardVisual);
      cardVisual.sprite = asSprite(sprite);
      tableauPiles[0].playingCardVisuals = [cardVisual];
      inputManager.registerDragListeners();
    });

    it("captures the dragged stack and lifts it on dragstart", () => {
      input.emit("dragstart", {}, asSprite(sprite));

      expect(inputManager.draggedStack).toEqual([cardVisual]);
      expect(inputManager.draggedStackOffsets).toEqual([{ x: 0, y: 0 }]);
      expect(sprite.depth).toBe(1000);
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

    it("does not start a drag when the pile visual is not found", () => {
      getPileVisualById.mockReturnValue(null);

      input.emit("dragstart", {}, asSprite(sprite));

      expect(inputManager.draggedStack).toEqual([]);
    });

    it("does not start a drag when the card visual is not in the pile visual", () => {
      tableauPiles[0].playingCardVisuals = [];

      input.emit("dragstart", {}, asSprite(sprite));

      expect(inputManager.draggedStack).toEqual([]);
    });

    it("moves the whole stack relative to the primary card on drag", () => {
      const followerVisual = new PlayingCardVisual(
        gameModel.tableaus[0].getCards()[0],
      );
      const followerSprite = createMockSprite({ x: 100, y: 180 });
      followerVisual.sprite = asSprite(followerSprite);
      tableauPiles[0].playingCardVisuals = [cardVisual, followerVisual];
      input.emit("dragstart", {}, asSprite(sprite));

      input.emit("drag", {}, asSprite(sprite), 200, 300);

      expect({ x: sprite.x, y: sprite.y }).toEqual({ x: 200, y: 300 });
      expect({ x: followerSprite.x, y: followerSprite.y }).toEqual({
        x: 200,
        y: 330,
      });
    });

    it("ignores drag events when nothing is being dragged", () => {
      input.emit("drag", {}, asSprite(sprite), 200, 300);

      expect({ x: sprite.x, y: sprite.y }).toEqual({ x: 100, y: 150 });
    });

    it("ignores dragend when nothing is being dragged", () => {
      input.emit("dragend", {}, asSprite(sprite));

      expect(updateVisualLayout).not.toHaveBeenCalled();
    });

    it("snaps back on dragend when the sprite has no card visual", () => {
      input.emit("dragstart", {}, asSprite(sprite));
      const dummy = createMockSprite();

      input.emit("dragend", {}, asSprite(dummy));

      expect(inputManager.draggedStack).toEqual([]);
      expect(updateVisualLayout).toHaveBeenCalled();
    });

    it("moves the card when dropped on a valid target pile", () => {
      const targetPile = tableauPiles[1];
      targetPile.position = { x: 150, y: 150 };
      targetPile.playingCardVisuals = [];
      sprite.setPosition(150, 150);
      const moveSpy = vi
        .spyOn(gameModel, "moveCardToPile")
        .mockReturnValue(true);
      input.emit("dragstart", {}, asSprite(sprite));

      input.emit("dragend", {}, asSprite(sprite));

      expect(moveSpy).toHaveBeenCalledWith(
        cardVisual.playingCard.id,
        targetPile.value.id,
      );
      expect(inputManager.draggedStack).toEqual([]);
    });

    it("snaps back when dropped on a target but the move is rejected", () => {
      const targetPile = tableauPiles[1];
      targetPile.position = { x: 150, y: 150 };
      targetPile.playingCardVisuals = [];
      sprite.setPosition(150, 150);
      vi.spyOn(gameModel, "moveCardToPile").mockReturnValue(false);
      input.emit("dragstart", {}, asSprite(sprite));

      input.emit("dragend", {}, asSprite(sprite));

      expect(updateVisualLayout).toHaveBeenCalled();
      expect(inputManager.draggedStack).toEqual([]);
    });

    it("snaps back without moving when dropped away from every pile", () => {
      sprite.setPosition(9000, 9000);
      const moveSpy = vi.spyOn(gameModel, "moveCardToPile");
      input.emit("dragstart", {}, asSprite(sprite));

      input.emit("dragend", {}, asSprite(sprite));

      expect(moveSpy).not.toHaveBeenCalled();
      expect(updateVisualLayout).toHaveBeenCalled();
      expect(inputManager.draggedStack).toEqual([]);
    });
  });
});
