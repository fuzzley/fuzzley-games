import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { clearPile, takeOffBoard } from "@test/support/game_scenarios";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { DragController } from "@/engine/render/input/drag_controller";
import { designSize } from "@/engine/render/layout/table_layout";
import {
  BoardInputManager,
  InputHost,
} from "@/engine/render/phaser/board_input_manager";
import { Viewport } from "@/engine/render/view/table_view_state";
import {
  FAKE_TABLE_LAYOUT,
  fakeTableGestures,
  fakeTableStackFromCard,
  resolveFakeTableDropTarget,
} from "@test/support/fake_table/board";
import { FakeTableGame } from "@test/support/fake_table/game";
import {
  asSprite,
  createMockInput,
  createMockSprite,
  MockInput,
  MockSprite,
} from "@test/support/phaser_mocks";

/**
 * The design size, which lays the board out at a scale of exactly 1 so the
 * pile origins the drop tests aim at are the design coordinates.
 */
const VIEWPORT: Viewport = { ...designSize(FAKE_TABLE_LAYOUT), pixelRatio: 1 };

vi.mock("phaser", async () => {
  const mocks = await import("@test/support/phaser_mocks");
  return mocks.geomPhaserMock();
});

describe("BoardInputManager", () => {
  let gameModel: FakeTableGame;
  let input: MockInput;
  let controller: DragController;
  let inputManager: BoardInputManager;

  beforeEach(() => {
    vi.useFakeTimers();

    gameModel = new FakeTableGame();
    gameModel.startNewGame();

    input = createMockInput();
    // The fixture's real wiring, so a press or a drop does what the game says
    // it does rather than what a stub decides.
    controller = new DragController(
      fakeTableGestures(gameModel),
      fakeTableStackFromCard(gameModel),
    );
    const dropTarget = resolveFakeTableDropTarget(gameModel);
    const host: InputHost = {
      input: input as unknown as InputHost["input"],
      dropTargetFor: (drag) => dropTarget(drag, VIEWPORT)?.pileId ?? null,
    };
    inputManager = new BoardInputManager(host, controller);
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
    return { sprite, card };
  }

  /** The pointer Phaser hands to an out event, from a mouse or from a finger. */
  const MOUSE = { wasTouch: false };
  const FINGER = { wasTouch: true };

  describe("card hover", () => {
    it("marks a card as hovered on pointerover", () => {
      const { sprite, card } = listenTo();

      sprite.emit("pointerover");

      expect(controller.hoveredCardId).toBe(card.id);
    });

    it("clears the hovered card on pointerout when it is the hovered card", () => {
      const { sprite, card } = listenTo();
      controller.cardOver(card.id);

      sprite.emit("pointerout", MOUSE);

      expect(controller.hoveredCardId).toBeNull();
    });

    it("leaves a different hovered card untouched on pointerout", () => {
      const { sprite } = listenTo();
      const otherId = gameModel.tableaus[1].getCards()[0].id;
      controller.cardOver(otherId);

      sprite.emit("pointerout", MOUSE);

      expect(controller.hoveredCardId).toBe(otherId);
    });
  });

  describe("card tap", () => {
    it("keeps the tapped card examined after the finger lifts", () => {
      const { sprite, card } = listenTo();

      sprite.emit("pointerover");
      sprite.emit("pointerout", FINGER);

      expect(controller.hoveredCardId).toBe(card.id);
    });

    it("puts a tapped card back when bare table is pressed", () => {
      const { sprite } = listenTo();
      inputManager.registerDragListeners();
      sprite.emit("pointerover");
      sprite.emit("pointerout", FINGER);

      input.emit("pointerdown", {}, []);

      expect(controller.hoveredCardId).toBeNull();
    });

    it("leaves it alone when the press landed on something", () => {
      const { sprite, card } = listenTo();
      inputManager.registerDragListeners();
      sprite.emit("pointerover");
      sprite.emit("pointerout", FINGER);

      input.emit("pointerdown", {}, [asSprite(sprite)]);

      expect(controller.hoveredCardId).toBe(card.id);
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
      takeOffBoard(gameModel, card.id);
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

      expect(controller.drag).toBeNull();
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
    /** Returns the card ids of each flight in the air, oldest first. */
    function flownStacks(): string[][] {
      return controller.flights.map((flight) => [...flight.cardIds]);
    }

    /** Picks up the given card's sprite and releases it over tableau 1. */
    function dragAndDrop(card = gameModel.tableaus[0].topCard!): void {
      // tableau-1 calculated layout origin: x: 348, y: 447
      const sprite = createMockSprite({ x: 350, y: 450 });
      sprite.setData("cardId", card.id);
      inputManager.registerDragListeners();
      input.emit("dragstart", {}, asSprite(sprite));
      input.emit("dragend", {}, asSprite(sprite));
    }

    it("tracks the dropped stack while it settles onto its new pile", () => {
      const card = gameModel.tableaus[0].topCard!;
      vi.spyOn(gameModel, "moveCardToPile").mockReturnValue(true);

      dragAndDrop(card);

      expect(flownStacks()).toEqual([[card.id]]);
    });

    it("still flies the stack home when the pile refuses it", () => {
      const card = gameModel.tableaus[0].topCard!;
      vi.spyOn(gameModel, "moveCardToPile").mockReturnValue(false);

      dragAndDrop(card);

      // Nothing moved in the model, so nothing announces it — but the card was
      // left under the pointer and still has the board to cross to get home.
      expect(flownStacks()).toEqual([[card.id]]);
    });
  });

  describe("stock background", () => {
    let stockBackground: MockSprite;

    beforeEach(() => {
      stockBackground = createMockSprite();
      inputManager.registerPileBackgroundListeners(
        asSprite(stockBackground),
        "stock",
      );
    });

    it("recycles the waste when the empty stock background is clicked", () => {
      clearPile(gameModel.stock);
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

      expect(controller.hoveredBackgroundPileId).toBe("stock");
    });

    it("clears the stock background hover on pointerout", () => {
      controller.backgroundOver("stock");

      stockBackground.emit("pointerout");

      expect(controller.hoveredBackgroundPileId).toBeNull();
    });

    it("clears a lingering stock background hover on a bare table press", () => {
      inputManager.registerDragListeners();
      controller.backgroundOver("stock");

      input.emit("pointerdown", {}, []);

      expect(controller.hoveredBackgroundPileId).toBeNull();
    });
  });

  describe("dragging", () => {
    let sprite: MockSprite;
    let card: PlayingCard;

    beforeEach(() => {
      card = gameModel.tableaus[0].topCard!;
      sprite = createMockSprite({ x: 100, y: 150 });
      sprite.setData("cardId", card.id);
      inputManager.registerDragListeners();
    });

    it("captures the dragged stack on dragstart", () => {
      input.emit("dragstart", {}, asSprite(sprite));

      expect(controller.drag?.cardIds).toEqual([card.id]);
    });

    it("does not start a drag when the sprite is not a card", () => {
      const dummy = createMockSprite();

      input.emit("dragstart", {}, asSprite(dummy));

      expect(controller.drag).toBeNull();
    });

    it("does not start a drag when the card is in no model pile", () => {
      takeOffBoard(gameModel, card.id);

      input.emit("dragstart", {}, asSprite(sprite));

      expect(controller.drag).toBeNull();
    });

    it("updates the primary drag position on drag", () => {
      input.emit("dragstart", {}, asSprite(sprite));
      input.emit("drag", {}, asSprite(sprite), 200, 300);

      expect(controller.drag?.primary).toEqual({ x: 200, y: 300 });
    });

    it("ignores drag events when nothing is being dragged", () => {
      input.emit("drag", {}, asSprite(sprite), 200, 300);

      expect(controller.drag).toBeNull();
    });

    it("ignores dragend when nothing is being dragged", () => {
      expect(() => input.emit("dragend", {}, asSprite(sprite))).not.toThrow();
    });

    it("snaps back on dragend when the sprite is not a card", () => {
      input.emit("dragstart", {}, asSprite(sprite));
      const dummy = createMockSprite();

      input.emit("dragend", {}, asSprite(dummy));

      expect(controller.drag).toBeNull();
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

      expect(controller.drag).toBeNull();
    });

    it("snaps back without moving when dropped away from every pile", () => {
      sprite.setPosition(9000, 9000);
      const moveSpy = vi.spyOn(gameModel, "moveCardToPile");
      input.emit("dragstart", {}, asSprite(sprite));

      input.emit("dragend", {}, asSprite(sprite));

      expect(moveSpy).not.toHaveBeenCalled();
      expect(controller.drag).toBeNull();
    });
  });
});
