// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type { GameObjects } from "phaser";
import type { HostedScene } from "@fz/phaser/host";
import type { SceneRun } from "@fz/phaser/testing";
import { clearPile, takeOffBoard } from "@test/support/game_scenarios";
import type { PlayingCard } from "@/engine/core/card/playing_card";
import { DragController } from "@/engine/render/input/drag_controller";
import { designSize } from "@/engine/render/layout/table_layout";
import type { Point } from "@/engine/render/layout/geometry";
import { BoardInputManager } from "@/engine/render/phaser/scene/board_input_manager";
import {
  type CardAtlas,
  cardAtlasTextureKey,
} from "@/engine/render/phaser/deck/card_deck_atlas";
import type { Viewport } from "@/engine/render/layout/viewport";
import {
  FAKE_TABLE_LAYOUT,
  fakeTableGestures,
  fakeTableStackFromCard,
  resolveFakeTableDropTarget,
} from "@test/support/fake_table/board";
import { FakeTableGame } from "@test/support/fake_table/game";
import { runSceneWithAtlases } from "@test/support/atlas_scene";

/**
 * The design size, which lays the board out at a scale of exactly 1 so the
 * pile origins the drop tests aim at are the design coordinates.
 */
const VIEWPORT: Viewport = { ...designSize(FAKE_TABLE_LAYOUT), pixelRatio: 1 };

/** The deck the sprites are drawn from, at the scale the board lays out at. */
const DECK: CardAtlas = { deckId: "classic", artScale: 1 };

/** Where a card dropped lands on tableau 1, whose origin is 348, 447. */
const OVER_TABLEAU_1: Point = { x: 350, y: 450 };

/** A point on the table that no sprite covers. */
const BARE_TABLE: Point = { x: VIEWPORT.width - 4, y: VIEWPORT.height - 4 };

describe("BoardInputManager", () => {
  let run: SceneRun<HostedScene>;
  let gameModel: FakeTableGame;
  let controller: DragController;
  let inputManager: BoardInputManager;
  /** The clock the controller times double presses by, in milliseconds. */
  let clock: number;
  /** How many sprites the spec has placed, which spaces the next one out. */
  let placed: number;

  beforeEach(async () => {
    run = await runSceneWithAtlases([DECK], designSize(FAKE_TABLE_LAYOUT));
    gameModel = new FakeTableGame();
    gameModel.startNewGame();
    clock = 0;
    placed = 0;

    // The fixture's real wiring, so a press or a drop does what the game says
    // it does rather than what a stub decides.
    controller = new DragController(
      fakeTableGestures(gameModel),
      fakeTableStackFromCard(gameModel),
      () => clock,
    );
    const dropTarget = resolveFakeTableDropTarget(gameModel);
    inputManager = new BoardInputManager(
      {
        input: run.scene.input,
        dropTargetFor: (drag) => dropTarget(drag, VIEWPORT)?.pileId ?? null,
      },
      controller,
    );
  });

  afterEach(() => {
    run.destroy();
  });

  /**
   * Adds an interactive sprite, as the board makes one, at a place of its own
   * along the top of the table unless told where.
   */
  function addSprite(at?: Point): GameObjects.Sprite {
    const { x, y } = at ?? { x: 10 + 230 * placed++, y: 10 };
    return run.scene.add
      .sprite(x, y, cardAtlasTextureKey(DECK), "card-back-blue")
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
  }

  /** Adds a sprite bound to a card, and listens to it as the board does. */
  function listenTo(
    card: PlayingCard = gameModel.tableaus[0].getCards()[0],
    at?: Point,
  ): { sprite: GameObjects.Sprite; card: PlayingCard } {
    const sprite = addSprite(at);
    // The scene stamps the id onto the sprite, which is how the drag handlers
    // recover which card a dragged object is.
    sprite.setData("cardId", card.id);
    inputManager.registerCardListeners(sprite, card.id);
    return { sprite, card };
  }

  /**
   * Steps a frame, which is when Phaser takes in what was made interactive
   * since the last, as one has passed by the time a player reaches a card.
   */
  function nextFrame(): void {
    run.advance(16);
  }

  /** Returns a point inside a sprite, a little in from its top left corner. */
  function inside(sprite: GameObjects.Sprite): [number, number] {
    return [sprite.x + 10, sprite.y + 10];
  }

  /** Clicks a sprite with the mouse. */
  function click(sprite: GameObjects.Sprite): void {
    nextFrame();
    run.pointer("down", ...inside(sprite));
    run.pointer("up", ...inside(sprite));
  }

  /** Moves the mouse onto a sprite. */
  function hover(sprite: GameObjects.Sprite): void {
    nextFrame();
    run.pointer("move", ...inside(sprite));
  }

  /** Moves the mouse off every sprite. */
  function leave(): void {
    run.pointer("move", BARE_TABLE.x, BARE_TABLE.y);
  }

  /** Presses the bare table with the mouse. */
  function pressBareTable(): void {
    run.pointer("down", BARE_TABLE.x, BARE_TABLE.y);
    run.pointer("up", BARE_TABLE.x, BARE_TABLE.y);
  }

  /** Taps a sprite with a finger. */
  function tap(sprite: GameObjects.Sprite): void {
    nextFrame();
    run.touch("start", ...inside(sprite));
    run.touch("end", ...inside(sprite));
  }

  /**
   * Picks a draggable sprite up and moves it so its corner lies at a point,
   * without letting go.
   */
  function dragTo(sprite: GameObjects.Sprite, to: Point): void {
    run.scene.input.setDraggable(sprite);
    nextFrame();
    const [x, y] = inside(sprite);
    run.pointer("down", x, y);
    run.pointer("move", to.x + x - sprite.x, to.y + y - sprite.y);
  }

  /** Lets go of whatever the mouse holds, where it is. */
  function letGo(): void {
    const { x, y } = run.game.input.activePointer;
    run.pointer("up", x, y);
  }

  /** Returns the messages of the errors a handler throws while `act` runs. */
  function errorsDuring(act: () => void): string[] {
    const errors: string[] = [];
    const record = (event: ErrorEvent): void => {
      errors.push((event.error as Error).message);
      event.preventDefault();
    };
    window.addEventListener("error", record);
    // jsdom reads the stack of an error a listener throws, and the first
    // stack through Phaser in a file maps every frame through the source map
    // Vitest makes of Phaser's whole bundle: half a second alone, and past a
    // spec's timeout on a busy machine, for frames no spec reads.
    const stackTraceLimit = Error.stackTraceLimit;
    Error.stackTraceLimit = 0;
    try {
      act();
    } finally {
      Error.stackTraceLimit = stackTraceLimit;
      window.removeEventListener("error", record);
    }
    return errors;
  }

  describe("card hover", () => {
    it("marks a card as hovered when the pointer moves over it", () => {
      const { sprite, card } = listenTo();

      hover(sprite);

      expect(controller.hoveredCardId).toBe(card.id);
    });

    it("clears the hovered card when the pointer leaves it", () => {
      const { sprite } = listenTo();
      hover(sprite);

      leave();

      expect(controller.hoveredCardId).toBeNull();
    });

    it("leaves a different hovered card untouched when the pointer leaves", () => {
      const { sprite } = listenTo();
      const otherId = gameModel.tableaus[1].getCards()[0].id;
      hover(sprite);
      controller.cardOver(otherId);

      leave();

      expect(controller.hoveredCardId).toBe(otherId);
    });
  });

  describe("card tap", () => {
    it("keeps the tapped card examined after the finger lifts", () => {
      const { sprite, card } = listenTo();

      tap(sprite);

      expect(controller.hoveredCardId).toBe(card.id);
    });

    it("puts a tapped card back when bare table is pressed", () => {
      const { sprite } = listenTo();
      inputManager.registerDragListeners();
      tap(sprite);

      pressBareTable();

      expect(controller.hoveredCardId).toBeNull();
    });

    it("leaves it alone when the press landed on something", () => {
      const { sprite, card } = listenTo();
      const somethingElse = addSprite();
      inputManager.registerDragListeners();
      tap(sprite);

      click(somethingElse);

      expect(controller.hoveredCardId).toBe(card.id);
    });
  });

  describe("stock interaction", () => {
    it("draws from the stock when the top stock card is clicked", () => {
      const drawSpy = vi.spyOn(gameModel, "drawCardsFromStock");
      const stock = gameModel.stock.getCards();
      const { sprite } = listenTo(stock[stock.length - 1]);

      click(sprite);

      expect(drawSpy).toHaveBeenCalled();
    });

    it("does not draw when a non-top stock card is clicked", () => {
      const drawSpy = vi.spyOn(gameModel, "drawCardsFromStock");
      const stock = gameModel.stock.getCards();
      const { sprite } = listenTo(stock[stock.length - 2]);

      click(sprite);

      expect(drawSpy).not.toHaveBeenCalled();
    });

    it("does not draw from the stock when a tableau card is clicked", () => {
      const drawSpy = vi.spyOn(gameModel, "drawCardsFromStock");
      const { sprite } = listenTo(gameModel.tableaus[0].getCards()[0]);

      click(sprite);

      expect(drawSpy).not.toHaveBeenCalled();
    });

    it("throws when the clicked card is in no pile", () => {
      const card = gameModel.tableaus[0].getCards()[0];
      takeOffBoard(gameModel, card.id);
      const { sprite } = listenTo(card);

      const errors = errorsDuring(() => {
        click(sprite);
      });

      expect(errors).toEqual([expect.stringContaining("is not in a pile")]);
    });
  });

  describe("a press on the page over the canvas", () => {
    let chrome: HTMLElement;

    beforeEach(() => {
      chrome = document.createElement("header");
      document.body.append(chrome);
    });

    afterEach(() => {
      chrome.remove();
    });

    it("does not press the card beneath it", () => {
      const drawSpy = vi.spyOn(gameModel, "drawCardsFromStock");
      const stock = gameModel.stock.getCards();
      const { sprite } = listenTo(stock[stock.length - 1]);

      nextFrame();
      run.pointer("down", ...inside(sprite), chrome);

      expect(drawSpy).not.toHaveBeenCalled();
    });

    it("does not press the empty pile beneath it", () => {
      clearPile(gameModel.stock);
      const drawSpy = vi.spyOn(gameModel, "drawCardsFromStock");
      const stockBackground = addSprite();
      inputManager.registerPileBackgroundListeners(stockBackground, "stock");

      nextFrame();
      run.pointer("down", ...inside(stockBackground), chrome);

      expect(drawSpy).not.toHaveBeenCalled();
    });

    it("does not pick up the card beneath it", () => {
      const { sprite } = listenTo(gameModel.tableaus[0].topCard);
      run.scene.input.setDraggable(sprite);
      inputManager.registerDragListeners();

      nextFrame();
      run.pointer("down", ...inside(sprite), chrome);

      expect(controller.drag).toBeNull();
    });
  });

  describe("double click", () => {
    it("auto-moves a tableau card to a foundation on double click", () => {
      const autoMoveSpy = vi.spyOn(gameModel, "autoMoveCard");
      const card = gameModel.tableaus[0].getCards()[0];
      const { sprite } = listenTo(card);

      click(sprite);
      click(sprite);

      expect(autoMoveSpy).toHaveBeenCalledWith(card.id);
    });

    it("leaves the card in place on a single click", () => {
      const autoMoveSpy = vi.spyOn(gameModel, "autoMoveCard");
      const { sprite } = listenTo(gameModel.tableaus[0].getCards()[0]);

      click(sprite);

      expect(autoMoveSpy).not.toHaveBeenCalled();
    });

    it("does not auto-move when the clicks are more than 350ms apart", () => {
      const autoMoveSpy = vi.spyOn(gameModel, "autoMoveCard");
      const { sprite } = listenTo(gameModel.tableaus[0].getCards()[0]);

      click(sprite);
      clock += 351;
      click(sprite);

      expect(autoMoveSpy).not.toHaveBeenCalled();
    });

    it("does not auto-move when the two clicks are on different cards", () => {
      const autoMoveSpy = vi.spyOn(gameModel, "autoMoveCard");
      const { sprite: s1 } = listenTo(gameModel.tableaus[0].getCards()[0]);
      const { sprite: s2 } = listenTo(gameModel.tableaus[1].getCards()[0]);

      click(s1);
      click(s2);

      expect(autoMoveSpy).not.toHaveBeenCalled();
    });

    it("does not auto-move stock cards on double click", () => {
      const autoMoveSpy = vi.spyOn(gameModel, "autoMoveCard");
      const { sprite } = listenTo(gameModel.stock.getCards()[0]);

      click(sprite);
      click(sprite);

      expect(autoMoveSpy).not.toHaveBeenCalled();
    });
  });

  describe("double click cancels the pending drag", () => {
    /**
     * Wires a draggable card sprite up to both the pointer and drag listeners,
     * over the tableau-1 drop target, and returns it.
     */
    function registerDraggableTableauCard(): GameObjects.Sprite {
      const { sprite } = listenTo(gameModel.tableaus[0].topCard, {
        ...OVER_TABLEAU_1,
      });
      run.scene.input.setDraggable(sprite);
      inputManager.registerDragListeners();
      return sprite;
    }

    it("clears the drag when a double click auto-moves the card", () => {
      vi.spyOn(gameModel, "autoMoveCard").mockReturnValue(true);
      const sprite = registerDraggableTableauCard();
      click(sprite);

      // The second press starts a drag, then completes the double click.
      run.pointer("down", ...inside(sprite));

      expect(controller.drag).toBeNull();
    });

    it("does not re-drop the card when the double click's press ends", () => {
      vi.spyOn(gameModel, "autoMoveCard").mockReturnValue(true);
      const sprite = registerDraggableTableauCard();
      click(sprite);
      run.pointer("down", ...inside(sprite));
      // A click is a drag that ends where it began, so the first one offered
      // the card to the pile beneath it; only the second must not.
      const moveSpy = vi.spyOn(gameModel, "moveCardToPile");

      run.pointer("up", ...inside(sprite));

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
      const { sprite } = listenTo(card);
      inputManager.registerDragListeners();
      dragTo(sprite, OVER_TABLEAU_1);
      letGo();
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
    let stockBackground: GameObjects.Sprite;

    beforeEach(() => {
      stockBackground = addSprite();
      inputManager.registerPileBackgroundListeners(stockBackground, "stock");
    });

    it("recycles the waste when the empty stock background is clicked", () => {
      clearPile(gameModel.stock);
      const drawSpy = vi.spyOn(gameModel, "drawCardsFromStock");

      click(stockBackground);

      expect(drawSpy).toHaveBeenCalled();
    });

    it("does nothing when the stock is not empty", () => {
      const drawSpy = vi.spyOn(gameModel, "drawCardsFromStock");

      click(stockBackground);

      expect(drawSpy).not.toHaveBeenCalled();
    });

    it("marks the stock background hovered when the pointer moves over it", () => {
      hover(stockBackground);

      expect(controller.hoveredBackgroundPileId).toBe("stock");
    });

    it("clears the stock background hover when the pointer leaves it", () => {
      hover(stockBackground);

      leave();

      expect(controller.hoveredBackgroundPileId).toBeNull();
    });

    it("clears a lingering stock background hover on a bare table press", () => {
      inputManager.registerDragListeners();
      controller.backgroundOver("stock");

      pressBareTable();

      expect(controller.hoveredBackgroundPileId).toBeNull();
    });
  });

  describe("dragging", () => {
    let sprite: GameObjects.Sprite;
    let card: PlayingCard;

    beforeEach(() => {
      card = gameModel.tableaus[0].topCard!;
      sprite = listenTo(card, { x: 100, y: 150 }).sprite;
      inputManager.registerDragListeners();
    });

    it("captures the dragged stack when a card is picked up", () => {
      dragTo(sprite, { x: 120, y: 170 });

      expect(controller.drag?.cardIds).toEqual([card.id]);
    });

    it("does not start a drag when the sprite is not a card", () => {
      const dummy = addSprite();

      dragTo(dummy, { x: 400, y: 400 });

      expect(controller.drag).toBeNull();
    });

    it("does not start a drag when the card is in no model pile", () => {
      takeOffBoard(gameModel, card.id);

      // The press that picks it up presses it too, which throws for a card in
      // no pile.
      const errors = errorsDuring(() => {
        dragTo(sprite, { x: 120, y: 170 });
      });

      expect([controller.drag, errors]).toEqual([
        null,
        [expect.stringContaining("is not in a pile")],
      ]);
    });

    it("follows the card's corner as it is dragged", () => {
      dragTo(sprite, { x: 200, y: 300 });

      expect(controller.drag?.primary).toEqual({ x: 200, y: 300 });
    });

    it("lets go of a sprite that is not a card without a drop", () => {
      const moveSpy = vi.spyOn(gameModel, "moveCardToPile");
      const dummy = addSprite();
      dragTo(dummy, OVER_TABLEAU_1);

      letGo();

      expect([controller.drag, moveSpy.mock.calls]).toEqual([null, []]);
    });

    it("moves the card when dropped on a valid target pile", () => {
      const moveSpy = vi
        .spyOn(gameModel, "moveCardToPile")
        .mockReturnValue(true);
      dragTo(sprite, OVER_TABLEAU_1);

      letGo();

      expect(moveSpy).toHaveBeenCalledWith(card.id, "tableau-1");
    });

    it("snaps back when dropped on a target but the move is rejected", () => {
      vi.spyOn(gameModel, "moveCardToPile").mockReturnValue(false);
      dragTo(sprite, OVER_TABLEAU_1);

      letGo();

      expect(controller.drag).toBeNull();
    });

    it("snaps back without moving when dropped away from every pile", () => {
      const moveSpy = vi.spyOn(gameModel, "moveCardToPile");
      dragTo(sprite, { x: 9000, y: 9000 });

      letGo();

      expect([controller.drag, moveSpy.mock.calls]).toEqual([null, []]);
    });
  });
});
