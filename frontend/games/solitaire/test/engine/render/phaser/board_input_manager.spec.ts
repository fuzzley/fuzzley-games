import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { BoardInputManager } from "@/engine/render/phaser/board_input_manager";
import { resolveKlondikeDropTarget } from "@/games/klondike/klondike_board";
import { SolitaireGame } from "@/games/klondike/solitaire_game";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { BoardScene } from "@/engine/render/phaser/board_scene";
import { designSize } from "@/engine/render/layout/table_layout";
import { KLONDIKE_LAYOUT } from "@/games/klondike/klondike_layout";

const DESIGN_WIDTH_PX = designSize(KLONDIKE_LAYOUT).width;
const DESIGN_HEIGHT_PX = designSize(KLONDIKE_LAYOUT).height;
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
  let cardSprites: Map<string, MockSprite>;
  let boardScene: BoardScene;
  let inputManager: BoardInputManager;

  beforeEach(() => {
    vi.useFakeTimers();

    gameModel = new SolitaireGame();
    gameModel.startNewGame();

    input = createMockInput();
    cardSprites = new Map();

    boardScene = {
      input,
      gameModel,
      cardSprite: (cardId: string) => {
        const sprite = cardSprites.get(cardId);
        return sprite ? asSprite(sprite) : undefined;
      },
      pixelRatio: 1,
      // The design size, which lays the board out at a scale of exactly 1 so
      // the pile origins the drop tests aim at are the design coordinates.
      viewport: {
        width: DESIGN_WIDTH_PX,
        height: DESIGN_HEIGHT_PX,
        pixelRatio: 1,
      },
      // The real Klondike resolver, so a drop lands where the game says it
      // would rather than where a stub decides.
      resolveDropTarget: resolveKlondikeDropTarget,
    } as unknown as BoardScene;

    inputManager = new BoardInputManager(boardScene);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Registers card listeners for a fresh sprite bound to the given card. */
  function listenTo(card: PlayingCard = gameModel.tableaus[0].getCards()[0]): {
    sprite: MockSprite;
    card: PlayingCard;
  } {
    const sprite = createMockSprite();
    // The scene stamps the id onto the sprite, which is how the drag handlers
    // recover which card a dragged object is.
    sprite.setData("cardId", card.id);
    inputManager.registerCardListeners(asSprite(sprite), card.id);
    cardSprites.set(card.id, sprite);
    return { sprite, card };
  }

  describe("card hover", () => {
    it("marks a card as hovered on pointerover", () => {
      const { sprite, card } = listenTo();

      sprite.emit("pointerover");

      expect(inputManager.hoveredCardId).toBe(card.id);
    });

    it("clears the hovered card on pointerout when it is the hovered card", () => {
      const { sprite, card } = listenTo();
      inputManager.hoveredCardId = card.id;

      sprite.emit("pointerout");

      expect(inputManager.hoveredCardId).toBeNull();
    });

    it("leaves a different hovered card untouched on pointerout", () => {
      const { sprite } = listenTo();
      const otherId = gameModel.tableaus[1].getCards()[0].id;
      inputManager.hoveredCardId = otherId;

      sprite.emit("pointerout");

      expect(inputManager.hoveredCardId).toBe(otherId);
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

  describe("double click cancels the pending drag", () => {
    /**
     * Wires a draggable card sprite up to both the pointer and drag listeners,
     * positioned over the tableau-1 drop target, and returns it.
     */
    function registerDraggableTableauCard(): {
      sprite: MockSprite;
      card: PlayingCard;
    } {
      const card = gameModel.tableaus[0].topCard!;
      // tableau-1 calculated layout origin: x: 348, y: 447
      const sprite = createMockSprite({ x: 350, y: 450 });
      sprite.setData("cardId", card.id);
      cardSprites.set(card.id, sprite);
      inputManager.registerCardListeners(asSprite(sprite), card.id);
      inputManager.registerDragListeners();
      return { sprite, card };
    }

    it("clears the drag when a double click auto-moves the card", () => {
      vi.spyOn(gameModel, "autoMoveCard").mockReturnValue(true);
      const { sprite } = registerDraggableTableauCard();

      sprite.emit("pointerdown"); // first click
      input.emit("dragstart", {}, asSprite(sprite)); // second press begins a drag
      sprite.emit("pointerdown"); // completes the double click

      expect(inputManager.drag).toBeNull();
    });

    it("does not re-drop the card on the dragend following the double click", () => {
      vi.spyOn(gameModel, "autoMoveCard").mockReturnValue(true);
      const moveSpy = vi.spyOn(gameModel, "moveCardToPile");
      const { sprite } = registerDraggableTableauCard();

      sprite.emit("pointerdown");
      input.emit("dragstart", {}, asSprite(sprite));
      sprite.emit("pointerdown"); // double click auto-moves and cancels the drag
      input.emit("dragend", {}, asSprite(sprite)); // trailing dragend must be a no-op

      expect(moveSpy).not.toHaveBeenCalled();
    });
  });

  describe("flight tracking", () => {
    /** Double clicks the given card's sprite. */
    function doubleClick(card = gameModel.tableaus[2].getCards()[1]): void {
      const { sprite } = listenTo(card);
      sprite.emit("pointerdown");
      sprite.emit("pointerdown");
    }

    it("tracks the whole auto-moved stack while it crosses the board", () => {
      vi.spyOn(gameModel, "autoMoveCard").mockReturnValue(true);
      const cards = gameModel.tableaus[2].getCards();

      doubleClick(cards[1]);

      // A move takes the cards stacked on top of the clicked one with it, and
      // every one of them has the board to cross.
      expect(inputManager.flight?.cardIds).toEqual([cards[1].id, cards[2].id]);
    });

    it("tracks nothing when no pile accepts the auto-moved card", () => {
      vi.spyOn(gameModel, "autoMoveCard").mockReturnValue(false);

      doubleClick();

      expect(inputManager.flight).toBeNull();
    });

    it("tracks the dropped stack while it settles onto its new pile", () => {
      const card = gameModel.tableaus[0].topCard!;
      // tableau-1 calculated layout origin: x: 348, y: 447
      const sprite = createMockSprite({ x: 350, y: 450 });
      sprite.setData("cardId", card.id);
      cardSprites.set(card.id, sprite);
      vi.spyOn(gameModel, "moveCardToPile").mockReturnValue(true);
      inputManager.registerDragListeners();
      input.emit("dragstart", {}, asSprite(sprite));

      input.emit("dragend", {}, asSprite(sprite));

      expect(inputManager.flight?.cardIds).toEqual([card.id]);
    });

    it("tracks nothing when the pile refuses the dropped stack", () => {
      const card = gameModel.tableaus[0].topCard!;
      const sprite = createMockSprite({ x: 350, y: 450 });
      sprite.setData("cardId", card.id);
      cardSprites.set(card.id, sprite);
      vi.spyOn(gameModel, "moveCardToPile").mockReturnValue(false);
      inputManager.registerDragListeners();
      input.emit("dragstart", {}, asSprite(sprite));

      input.emit("dragend", {}, asSprite(sprite));

      expect(inputManager.flight).toBeNull();
    });

    it("stops tracking the stack once it has landed", () => {
      vi.spyOn(gameModel, "autoMoveCard").mockReturnValue(true);
      doubleClick();

      inputManager.endFlight();

      expect(inputManager.flight).toBeNull();
    });

    it("stops tracking the stack on a game reset", () => {
      vi.spyOn(gameModel, "autoMoveCard").mockReturnValue(true);
      doubleClick();

      inputManager.resetInteraction();

      expect(inputManager.flight).toBeNull();
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

      expect(inputManager.hoveredBackgroundPileId).toBe("stock");
    });

    it("clears the stock background hover on pointerout", () => {
      inputManager.hoveredBackgroundPileId = "stock";

      stockBackground.emit("pointerout");

      expect(inputManager.hoveredBackgroundPileId).toBeNull();
    });
  });

  describe("dragging", () => {
    let sprite: MockSprite;
    let card: PlayingCard;

    beforeEach(() => {
      card = gameModel.tableaus[0].topCard!;
      sprite = createMockSprite({ x: 100, y: 150 });
      sprite.setData("cardId", card.id);
      cardSprites.set(card.id, sprite);
      inputManager.registerDragListeners();
    });

    it("captures the dragged stack on dragstart", () => {
      input.emit("dragstart", {}, asSprite(sprite));

      expect(inputManager.drag?.cardIds).toEqual([card.id]);
    });

    it("does not start a drag when the sprite is not a card", () => {
      const dummy = createMockSprite();

      input.emit("dragstart", {}, asSprite(dummy));

      expect(inputManager.drag).toBeNull();
    });

    it("does not start a drag when the card is in no model pile", () => {
      gameModel.tableaus[0].removeCard(card);

      input.emit("dragstart", {}, asSprite(sprite));

      expect(inputManager.drag).toBeNull();
    });

    it("updates the primary drag position on drag", () => {
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

    it("snaps back on dragend when the sprite is not a card", () => {
      input.emit("dragstart", {}, asSprite(sprite));
      const dummy = createMockSprite();

      input.emit("dragend", {}, asSprite(dummy));

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

      expect(moveSpy).toHaveBeenCalledWith(card.id, "tableau-1");
    });

    it("snaps back when dropped on a target but the move is rejected", () => {
      sprite.setPosition(350, 450);
      vi.spyOn(gameModel, "moveCardToPile").mockReturnValue(false);
      input.emit("dragstart", {}, asSprite(sprite));

      input.emit("dragend", {}, asSprite(sprite));

      expect(inputManager.drag).toBeNull();
    });

    it("snaps back without moving when dropped away from every pile", () => {
      sprite.setPosition(9000, 9000);
      const moveSpy = vi.spyOn(gameModel, "moveCardToPile");
      input.emit("dragstart", {}, asSprite(sprite));

      input.emit("dragend", {}, asSprite(sprite));

      expect(moveSpy).not.toHaveBeenCalled();
      expect(inputManager.drag).toBeNull();
    });
  });

  describe("reset", () => {
    it("clears interaction state and requests a snap on reset", () => {
      const card = gameModel.tableaus[0].getCards()[0];
      inputManager.hoveredCardId = card.id;
      inputManager.hoveredBackgroundPileId = "stock";
      inputManager.drag = { cardIds: [card.id], primary: { x: 1, y: 2 } };
      inputManager.snapAll = false;

      inputManager.resetInteraction();

      expect(inputManager.interaction).toEqual({
        hoveredCardId: null,
        hoveredBackgroundPileId: null,
        drag: null,
        flight: null,
        snapAll: true,
      });
    });
  });
});
