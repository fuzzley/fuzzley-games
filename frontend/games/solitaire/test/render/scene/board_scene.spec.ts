import { vi, describe, it, expect, beforeEach } from "vitest";
import { BoardScene } from "../../../src/render/scene/board_scene";
import { SolitaireGame } from "../../../src/model/game/solitaire_game";
import {
  Suit,
  Type,
  ALL_PLAYING_CARD_IDS,
} from "../../../src/model/card/playing_card";

interface MockInput {
  _trigger(event: string, ...args: unknown[]): void;
}

// Mock phaser entirely
vi.mock("phaser", () => {
  const createMockSprite = () => {
    const listeners: { [event: string]: Function[] } = {};
    const dataMap = new Map<string, any>();
    const sprite = {
      x: 0,
      y: 0,
      scale: 1,
      depth: 0,
      frame: "",
      originX: 0,
      originY: 0,
      setOrigin: vi.fn().mockImplementation(function (
        this: any,
        x: number,
        y: number,
      ) {
        this.originX = x;
        this.originY = y;
        return this;
      }),
      setInteractive: vi.fn().mockImplementation(function (this: any) {
        this.input = { cursor: "pointer" };
        return this;
      }),
      on: vi.fn().mockImplementation((event: string, cb: Function) => {
        if (!listeners[event]) {
          listeners[event] = [];
        }
        listeners[event].push(cb);
        return sprite;
      }),
      emit: (event: string, ...args: any[]) => {
        if (listeners[event]) {
          listeners[event].forEach((cb) => cb(...args));
        }
      },
      setFrame: vi.fn().mockImplementation(function (this: any, frame: string) {
        this.frame = frame;
        return this;
      }),
      setPosition: vi.fn().mockImplementation(function (
        this: any,
        x: number,
        y: number,
      ) {
        this.x = x;
        this.y = y;
        return this;
      }),
      setScale: vi.fn().mockImplementation(function (this: any, scale: number) {
        this.scale = scale;
        return this;
      }),
      setDepth: vi.fn().mockImplementation(function (this: any, depth: number) {
        this.depth = depth;
        return this;
      }),
      setData: vi.fn().mockImplementation((key: string, val: any) => {
        dataMap.set(key, val);
        return sprite;
      }),
      getData: vi.fn().mockImplementation((key: string) => {
        return dataMap.get(key);
      }),
      displayWidth: 220,
      displayHeight: 307,
      input: undefined,
      active: true,
    };
    return sprite;
  };

  return {
    Scene: class MockScene {
      add = {
        graphics: vi.fn(() => ({
          clear: vi.fn().mockReturnThis(),
          lineStyle: vi.fn().mockReturnThis(),
          strokeRect: vi.fn().mockReturnThis(),
          strokeRoundedRect: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
        })),
        sprite: vi.fn(() => createMockSprite()),
      };
      scale = {
        on: vi.fn(),
      };
      input: any;
      constructor() {
        const listeners: { [event: string]: { cb: Function; context?: any } } =
          {};
        this.input = {
          on: vi
            .fn()
            .mockImplementation(
              (event: string, cb: Function, context?: any) => {
                listeners[event] = { cb, context };
                return this.input;
              },
            ),
          setDraggable: vi.fn(),
          _trigger: (event: string, ...args: any[]) => {
            const listener = listeners[event];
            if (listener) {
              listener.cb.apply(listener.context, args);
            }
          },
        };
      }
    },
    Geom: {
      Rectangle: Object.assign(
        class MockRectangle {
          constructor(
            public x = 0,
            public y = 0,
            public width = 0,
            public height = 0,
          ) {}
        },
        {
          Intersection: (rect1: any, rect2: any, out: any) => {
            const x5 = Math.max(rect1.x, rect2.x);
            const y5 = Math.max(rect1.y, rect2.y);
            const x6 = Math.min(rect1.x + rect1.width, rect2.x + rect2.width);
            const y6 = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);

            if (x5 >= x6 || y5 >= y6) {
              out.x = 0;
              out.y = 0;
              out.width = 0;
              out.height = 0;
            } else {
              out.x = x5;
              out.y = y5;
              out.width = x6 - x5;
              out.height = y6 - y5;
            }
            return out;
          },
        },
      ),
    },
  };
});

describe("BoardScene", () => {
  let boardScene: BoardScene;

  beforeEach(() => {
    boardScene = new BoardScene();
    boardScene.create();
  });

  it("assigns card-placeholder background sprite to stock and tableau piles", () => {
    expect(boardScene.stockPile.sprite).toBeDefined();
    expect(boardScene.stockPile.sprite).not.toBeNull();
    for (const tableauPile of boardScene.tableauPiles) {
      expect(tableauPile.sprite).toBeDefined();
      expect(tableauPile.sprite).not.toBeNull();
    }
  });

  it("updates hand cursor for cards based on interactability", () => {
    // Initially, cards in tableau 0 (top/only card) should have 'pointer'
    const tableau0 = boardScene.tableauPiles[0];
    const cardVisual0 = tableau0.playingCardVisuals[0];
    expect(cardVisual0.sprite.input.cursor).toBe("pointer");

    // Cards in tableau 1: top card (faceUp) should have 'pointer', bottom card (faceDown) should have 'default'
    const tableau1 = boardScene.tableauPiles[1];
    const cardVisualBottom = tableau1.playingCardVisuals[0];
    const cardVisualTop = tableau1.playingCardVisuals[1];
    expect(cardVisualBottom.sprite.input.cursor).toBe("default");
    expect(cardVisualTop.sprite.input.cursor).toBe("pointer");

    // After flipping the top card of tableau 0 face down, emitting 'card-flipped' on the model should update it to 'default'
    const card0 = cardVisual0.playingCard;
    card0.faceUp = false;
    boardScene.gameModel.emit("card-flipped", {
      cardId: card0.id,
      faceUp: false,
    });
    expect(cardVisual0.sprite.input.cursor).toBe("default");
  });

  it("getPileVisualById returns the pile or null if not found", () => {
    expect(boardScene.getPileVisualById("stock")).toBe(boardScene.stockPile);
    expect(boardScene.getPileVisualById("non-existent-pile")).toBeNull();
  });

  it("triggers layout updates when the scale resize event fires", () => {
    // Arrange
    boardScene.scale.width = 903.5;
    boardScene.scale.height = 475;

    // Retrieve and call the registered callback
    const scaleOnCalls = vi.mocked(boardScene.scale.on).mock.calls;
    const resizeCall = scaleOnCalls.find(
      (call: unknown[]) => call[0] === "resize",
    );
    expect(resizeCall).toBeDefined();

    const resizeCallback = resizeCall[1];

    // Act
    resizeCallback();

    // Assert
    expect(boardScene.stockPile.position).toEqual({ x: 20, y: 20 });
  });

  it("initially populates stock pile visuals with playing cards", () => {
    expect(boardScene.stockPile.playingCardVisuals.length).toBeGreaterThan(0);
  });

  it("syncs visual piles on card-moved event", () => {
    const game = boardScene.gameModel;
    game.stock.clear();

    game.emit("card-moved");

    expect(boardScene.stockPile.playingCardVisuals.length).toBe(0);
  });

  it("syncs visual piles on stock-recycled event", () => {
    const game = boardScene.gameModel;
    game.stock.clear();

    game.emit("stock-recycled");

    expect(boardScene.stockPile.playingCardVisuals.length).toBe(0);
  });

  it("logs a message on game-won event", () => {
    const game = boardScene.gameModel;
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    game.emit("game-won");

    expect(consoleLogSpy).toHaveBeenCalledWith("Congratulations! You won!");
    consoleLogSpy.mockRestore();
  });

  it("updates card sprite frame to card ID on card-flipped event (faceUp true)", () => {
    const game = boardScene.gameModel;
    const tableau0 = boardScene.tableauPiles[0];
    const visual0 = tableau0.playingCardVisuals[0];

    game.emit("card-flipped", { cardId: visual0.playingCard.id, faceUp: true });

    expect(visual0.sprite.frame).toBe(visual0.playingCard.id);
  });

  it("updates card sprite frame to card-back-blue on card-flipped event (faceUp false)", () => {
    const game = boardScene.gameModel;
    const tableau0 = boardScene.tableauPiles[0];
    const visual0 = tableau0.playingCardVisuals[0];

    game.emit("card-flipped", {
      cardId: visual0.playingCard.id,
      faceUp: false,
    });

    expect(visual0.sprite.frame).toBe("card-back-blue");
  });

  it("does not crash on card-flipped event if card visual lacks a sprite", () => {
    const game = boardScene.gameModel;
    const tableau0 = boardScene.tableauPiles[0];
    const visual0 = tableau0.playingCardVisuals[0];
    const oldSprite = visual0.sprite;
    visual0.sprite = null as unknown as Phaser.GameObjects.Sprite;

    expect(() => {
      game.emit("card-flipped", {
        cardId: visual0.playingCard.id,
        faceUp: true,
      });
    }).not.toThrow();
    visual0.sprite = oldSprite;
  });

  it("throws error in createCardVisuals if a card model is not found", () => {
    const customBoardScene = new BoardScene();
    const getCardSpy = vi
      .spyOn(SolitaireGame.prototype, "getCardById")
      .mockReturnValue(undefined);
    expect(() => customBoardScene.create()).toThrow(
      "Card model not found for: ",
    );
    getCardSpy.mockRestore();
  });

  it("highlights card on card pointerover", () => {
    const tableau0 = boardScene.tableauPiles[0];
    const visual0 = tableau0.playingCardVisuals[0];
    const sprite = visual0.sprite;
    const originalGraphics = boardScene["highlightGraphics"];
    originalGraphics.strokeRoundedRect.mockClear();

    sprite.emit("pointerover");

    expect(originalGraphics.strokeRoundedRect).toHaveBeenCalled();
  });

  it("clears highlight on card pointerout", () => {
    const tableau0 = boardScene.tableauPiles[0];
    const visual0 = tableau0.playingCardVisuals[0];
    const sprite = visual0.sprite;
    const originalGraphics = boardScene["highlightGraphics"];
    sprite.emit("pointerover");
    originalGraphics.clear.mockClear();

    sprite.emit("pointerout");

    expect(originalGraphics.clear).toHaveBeenCalled();
  });

  it("does not clear highlight on pointerout if a different card is hovered", () => {
    const tableau0 = boardScene.tableauPiles[0];
    const visual0 = tableau0.playingCardVisuals[0];
    const sprite = visual0.sprite;
    sprite.emit("pointerover");

    const visual1 = boardScene.tableauPiles[1].playingCardVisuals[1];
    visual1.sprite.emit("pointerover");

    const originalGraphics = boardScene["highlightGraphics"];

    sprite.emit("pointerout");

    originalGraphics.strokeRoundedRect.mockClear();
    boardScene.updateHighlightBorder();
    expect(originalGraphics.strokeRoundedRect).toHaveBeenCalled();
  });

  it("draws card on pointerdown of top stock card", () => {
    const game = boardScene.gameModel;
    const stockVisual = boardScene.stockPile.playingCardVisuals[23];
    const stockSprite = stockVisual.sprite;
    const initialStockLength = game.stock.getCards().length;

    stockSprite.emit("pointerdown");

    expect(game.stock.getCards().length).toBe(initialStockLength - 3);
    expect(game.waste.getCards().length).toBe(3);
  });

  it("does not draw card on pointerdown of non-top stock card", () => {
    const game = boardScene.gameModel;
    const nonTopStockVisual = boardScene.stockPile.playingCardVisuals[0];
    const nonTopStockSprite = nonTopStockVisual.sprite;
    const initialStockLength = game.stock.getCards().length;

    nonTopStockSprite.emit("pointerdown");

    expect(game.stock.getCards().length).toBe(initialStockLength);
    expect(game.waste.getCards().length).toBe(0);
  });

  it("recycles stock on pointerdown of stock background when stock is empty", () => {
    const game = boardScene.gameModel;
    game.stock.clear();
    const card = game.getCardById("card-clubs-ace")!;
    game.getPileContainingCard(card.id)?.removeCard(card);
    game.waste.addCard(card);
    const bgSprite = boardScene.stockPile.sprite;

    bgSprite.emit("pointerdown");

    expect(game.stock.getCards().length).toBe(1);
    expect(game.waste.getCards().length).toBe(0);
  });

  it("does not recycle stock on pointerdown of stock background when stock is not empty", () => {
    const game = boardScene.gameModel;
    const initialStockLength = game.stock.getCards().length;
    const bgSprite = boardScene.stockPile.sprite;

    bgSprite.emit("pointerdown");

    expect(game.stock.getCards().length).toBe(initialStockLength);
  });

  it("throws error on pointerdown of a card not in any pile", () => {
    const ghostCardVisual = boardScene.tableauPiles[0].playingCardVisuals[0];
    const getPileSpy = vi
      .spyOn(SolitaireGame.prototype, "getPileContainingCard")
      .mockReturnValue(undefined);

    expect(() => {
      ghostCardVisual.sprite.emit("pointerdown");
    }).toThrow(/is not in a pile/);
    getPileSpy.mockRestore();
  });

  it("does not draw card on pointerdown of a tableau card", () => {
    const game = boardScene.gameModel;
    const initialStockLength = game.stock.getCards().length;
    const tableauVisual = boardScene.tableauPiles[0].playingCardVisuals[0];

    tableauVisual.sprite.emit("pointerdown");

    expect(game.stock.getCards().length).toBe(initialStockLength);
  });

  it("syncVisualPilesWithModel syncs foundation cards correctly", () => {
    const card = boardScene.tableauPiles[0].playingCardVisuals[0].playingCard;
    // Clear card from its current pile first
    const sourcePile = boardScene.gameModel.getPileContainingCard(card.id);
    sourcePile?.removeCard(card);

    // Add to foundation pile
    boardScene.gameModel.foundations[0].addCard(card);

    // Call sync
    boardScene["syncVisualPilesWithModel"]();

    expect(boardScene.foundationPiles[0].playingCardVisuals.length).toBe(1);
    expect(
      boardScene.foundationPiles[0].playingCardVisuals[0].playingCard,
    ).toBe(card);
  });

  it("does not crash when highlightGraphics is null", () => {
    const originalGraphics = boardScene["highlightGraphics"];
    boardScene["highlightGraphics"] =
      null as unknown as Phaser.GameObjects.Graphics;

    expect(() => boardScene.updateHighlightBorder()).not.toThrow();
    boardScene["highlightGraphics"] = originalGraphics;
  });

  it("clears highlight when hoveredCardVisual is null", () => {
    const originalGraphics = boardScene["highlightGraphics"];
    originalGraphics.clear.mockClear();

    boardScene.updateHighlightBorder();

    expect(originalGraphics.clear).toHaveBeenCalled();
  });

  it("does not draw border if hoveredCardVisual is not interactable", () => {
    const originalGraphics = boardScene["highlightGraphics"];
    const visual = boardScene.tableauPiles[1].playingCardVisuals[0];
    expect(visual.playingCard.faceUp).toBe(false);

    visual.sprite.emit("pointerover");
    originalGraphics.strokeRoundedRect.mockClear();

    boardScene.updateHighlightBorder();

    expect(originalGraphics.strokeRoundedRect).not.toHaveBeenCalled();
  });

  it("does not draw border if hoveredCardVisual sprite is inactive", () => {
    const originalGraphics = boardScene["highlightGraphics"];
    const tableau0 = boardScene.tableauPiles[0];
    const visual = tableau0.playingCardVisuals[0];

    visual.sprite.emit("pointerover");
    visual.sprite.active = false;
    originalGraphics.strokeRoundedRect.mockClear();

    boardScene.updateHighlightBorder();

    expect(originalGraphics.strokeRoundedRect).not.toHaveBeenCalled();
    visual.sprite.active = true;
  });

  it("draws rounded rectangle border for an interactable active hovered card", () => {
    const originalGraphics = boardScene["highlightGraphics"];
    const tableau0 = boardScene.tableauPiles[0];
    const visual = tableau0.playingCardVisuals[0];

    visual.sprite.emit("pointerover");
    originalGraphics.strokeRoundedRect.mockClear();

    boardScene.updateHighlightBorder();

    expect(originalGraphics.strokeRoundedRect).toHaveBeenCalled();
  });

  it("does not draw border if a card is currently being dragged", () => {
    const originalGraphics = boardScene["highlightGraphics"];
    const tableau0 = boardScene.tableauPiles[0];
    const visual = tableau0.playingCardVisuals[0];

    visual.sprite.emit("pointerover");
    originalGraphics.strokeRoundedRect.mockClear();
    originalGraphics.clear.mockClear();

    boardScene["draggedStack"] = [visual];

    boardScene.updateHighlightBorder();

    expect(originalGraphics.clear).toHaveBeenCalled();
    expect(originalGraphics.strokeRoundedRect).not.toHaveBeenCalled();

    boardScene["draggedStack"] = [];
  });

  it("updates cursor and hover state on non-empty stock background hover", () => {
    const bgSprite = boardScene.stockPile.sprite;
    const originalGraphics = boardScene["highlightGraphics"];
    originalGraphics.strokeRoundedRect.mockClear();

    bgSprite.emit("pointerover");

    expect(bgSprite.input.cursor).toBe("default");
    boardScene.updateHighlightBorder();
    expect(originalGraphics.strokeRoundedRect).not.toHaveBeenCalled();
  });

  it("updates cursor, hover state, and highlights empty stock background hover", () => {
    const bgSprite = boardScene.stockPile.sprite;
    const originalGraphics = boardScene["highlightGraphics"];

    boardScene.stockPile.value.clear();
    boardScene.gameModel.emit("card-moved");
    originalGraphics.strokeRoundedRect.mockClear();

    bgSprite.emit("pointerover");

    expect(bgSprite.input.cursor).toBe("pointer");
    boardScene.updateHighlightBorder();
    expect(originalGraphics.strokeRoundedRect).toHaveBeenCalled();
  });

  it("clears hover state and highlight on pointerout of empty stock background", () => {
    const bgSprite = boardScene.stockPile.sprite;
    const originalGraphics = boardScene["highlightGraphics"];

    boardScene.stockPile.value.clear();
    boardScene.gameModel.emit("card-moved");
    bgSprite.emit("pointerover");
    originalGraphics.strokeRoundedRect.mockClear();

    bgSprite.emit("pointerout");

    boardScene.updateHighlightBorder();
    expect(originalGraphics.strokeRoundedRect).not.toHaveBeenCalled();
  });

  it("throws error during creation if a card has an invalid suit", () => {
    const invalidCard = { suit: 999 as unknown as Suit, type: Type.ACE };
    ALL_PLAYING_CARD_IDS.push(invalidCard);

    expect(() => {
      boardScene.create();
    }).toThrow("Unknown Suit: 999");

    ALL_PLAYING_CARD_IDS.pop();
  });

  it("throws error during creation if a card has an invalid type", () => {
    const invalidTypeCard = { suit: Suit.SPADE, type: 999 as unknown as Type };
    ALL_PLAYING_CARD_IDS.push(invalidTypeCard);

    expect(() => {
      boardScene.create();
    }).toThrow("Unknown Type: 999");

    ALL_PLAYING_CARD_IDS.pop();
  });

  describe("Drag and Drop Interaction", () => {
    it("registers drag event listeners during create", () => {
      expect(boardScene.input.on).toHaveBeenCalledWith(
        "dragstart",
        expect.any(Function),
      );
      expect(boardScene.input.on).toHaveBeenCalledWith(
        "drag",
        expect.any(Function),
      );
      expect(boardScene.input.on).toHaveBeenCalledWith(
        "dragend",
        expect.any(Function),
      );
    });

    it("correctly tracks and updates dragged stack and positions", () => {
      const tableau0 = boardScene.tableauPiles[0];
      const visual0 = tableau0.playingCardVisuals[0];
      const sprite0 = visual0.sprite;
      sprite0.x = 50;
      sprite0.y = 100;

      // Trigger dragstart
      (boardScene.input as unknown as MockInput)._trigger(
        "dragstart",
        {},
        sprite0,
      );
      expect(boardScene["draggedStack"]).toContain(visual0);
      expect(boardScene["draggedStackOffsets"]).toEqual([{ x: 0, y: 0 }]);

      // Trigger drag to a new position
      (boardScene.input as unknown as MockInput)._trigger(
        "drag",
        {},
        sprite0,
        150,
        250,
      );
      expect(sprite0.x).toBe(150);
      expect(sprite0.y).toBe(250);
    });

    it("clears highlight border when drag starts", () => {
      const originalGraphics = boardScene["highlightGraphics"];
      const tableau0 = boardScene.tableauPiles[0];
      const visual0 = tableau0.playingCardVisuals[0];

      // Hover the card first to establish hover state
      visual0.sprite.emit("pointerover");
      boardScene.updateHighlightBorder();
      expect(originalGraphics.strokeRoundedRect).toHaveBeenCalled();

      originalGraphics.clear.mockClear();
      originalGraphics.strokeRoundedRect.mockClear();

      // Trigger dragstart
      (boardScene.input as unknown as MockInput)._trigger(
        "dragstart",
        {},
        visual0.sprite,
      );

      expect(originalGraphics.clear).toHaveBeenCalled();
      expect(originalGraphics.strokeRoundedRect).not.toHaveBeenCalled();
    });

    it("moves card to foundation/tableau if dropped and valid", () => {
      const tableau0 = boardScene.tableauPiles[0];
      const visual0 = tableau0.playingCardVisuals[0];
      const sprite0 = visual0.sprite;
      sprite0.x = 50;
      sprite0.y = 100;

      // Position the target pile to overlap the drag location
      const targetPile = boardScene.tableauPiles[1];
      targetPile.position = { x: 150, y: 250 };
      targetPile.playingCardVisuals.length = 0; // Empty target pile

      // Trigger dragstart and drag
      (boardScene.input as unknown as MockInput)._trigger(
        "dragstart",
        {},
        sprite0,
      );
      (boardScene.input as unknown as MockInput)._trigger(
        "drag",
        {},
        sprite0,
        150,
        250,
      );

      // Spy on moveCardToPile
      const moveSpy = vi
        .spyOn(boardScene.gameModel, "moveCardToPile")
        .mockReturnValue(true);

      // Trigger dragend
      (boardScene.input as unknown as MockInput)._trigger(
        "dragend",
        {},
        sprite0,
      );

      expect(moveSpy).toHaveBeenCalledWith(
        visual0.playingCard.id,
        targetPile.value.id,
      );
    });

    it("snaps cards back to layout if move is invalid or not dropped on a pile", () => {
      const tableau0 = boardScene.tableauPiles[0];
      const visual0 = tableau0.playingCardVisuals[0];
      const sprite0 = visual0.sprite;
      sprite0.x = 50;
      sprite0.y = 100;

      // Trigger dragstart and drag
      (boardScene.input as unknown as MockInput)._trigger(
        "dragstart",
        {},
        sprite0,
      );
      (boardScene.input as unknown as MockInput)._trigger(
        "drag",
        {},
        sprite0,
        800,
        800,
      ); // Out of bounds / no overlap

      const layoutSpy = vi.spyOn(
        boardScene["layoutManager"],
        "updateVisualLayout",
      );

      // Trigger dragend
      (boardScene.input as unknown as MockInput)._trigger(
        "dragend",
        {},
        sprite0,
      );

      expect(layoutSpy).toHaveBeenCalled();
    });

    it("correctly moves a stack of multiple cards during drag", () => {
      const tableau0 = boardScene.tableauPiles[0];
      const visual0 = tableau0.playingCardVisuals[0];

      // Let's manually add a second visual card to this tableau pile in the view
      const visual1 = boardScene.tableauPiles[1].playingCardVisuals[0];
      // remove from tableau1
      boardScene.tableauPiles[1].playingCardVisuals = [];
      // append to tableau0
      tableau0.playingCardVisuals.push(visual1);

      const sprite0 = visual0.sprite;
      const sprite1 = visual1.sprite;

      sprite0.x = 50;
      sprite0.y = 100;
      sprite1.x = 50;
      sprite1.y = 130;

      // Trigger dragstart on the bottom card (visual0)
      (boardScene.input as unknown as MockInput)._trigger(
        "dragstart",
        {},
        sprite0,
      );

      expect(boardScene["draggedStack"]).toEqual([visual0, visual1]);
      expect(boardScene["draggedStackOffsets"]).toEqual([
        { x: 0, y: 0 },
        { x: 0, y: 30 },
      ]);

      // Trigger drag to a new position
      (boardScene.input as unknown as MockInput)._trigger(
        "drag",
        {},
        sprite0,
        150,
        250,
      );

      expect(sprite0.x).toBe(150);
      expect(sprite0.y).toBe(250);
      expect(sprite1.x).toBe(150);
      expect(sprite1.y).toBe(280);

      // Trigger dragend to cleanup
      (boardScene.input as unknown as MockInput)._trigger(
        "dragend",
        {},
        sprite0,
      );
    });

    it("handles dragend gracefully when the dragged sprite is not a card visual", () => {
      const dummySprite = boardScene.add.sprite(
        0,
        0,
        "card_assets",
        "card-placeholder",
      );

      // Set draggedStack to non-empty to pass the initial check
      const visual = boardScene.tableauPiles[0].playingCardVisuals[0];
      boardScene["draggedStack"] = [visual];

      const layoutSpy = vi.spyOn(
        boardScene["layoutManager"],
        "updateVisualLayout",
      );

      // Trigger dragend with the dummy sprite
      (boardScene.input as unknown as MockInput)._trigger(
        "dragend",
        {},
        dummySprite,
      );

      expect(layoutSpy).toHaveBeenCalled();
      expect(boardScene["draggedStack"].length).toBe(0);
    });

    it("onDragStart returns early if sprite lacks cardVisual data", () => {
      const dummySprite = boardScene.add.sprite(
        0,
        0,
        "card_assets",
        "card-placeholder",
      );
      (boardScene.input as unknown as MockInput)._trigger(
        "dragstart",
        {},
        dummySprite,
      );
      expect(boardScene["draggedStack"].length).toBe(0);
    });

    it("onDragStart returns early if card is not in any pile in model", () => {
      const tableau0 = boardScene.tableauPiles[0];
      const visual0 = tableau0.playingCardVisuals[0];
      const getPileSpy = vi
        .spyOn(boardScene.gameModel, "getPileContainingCard")
        .mockReturnValue(undefined);

      (boardScene.input as unknown as MockInput)._trigger(
        "dragstart",
        {},
        visual0.sprite,
      );

      expect(boardScene["draggedStack"].length).toBe(0);
      getPileSpy.mockRestore();
    });

    it("onDragStart returns early if source pile visual is not found", () => {
      const tableau0 = boardScene.tableauPiles[0];
      const visual0 = tableau0.playingCardVisuals[0];
      const getPileVisualSpy = vi
        .spyOn(boardScene, "getPileVisualById")
        .mockReturnValue(null);

      (boardScene.input as unknown as MockInput)._trigger(
        "dragstart",
        {},
        visual0.sprite,
      );

      expect(boardScene["draggedStack"].length).toBe(0);
      getPileVisualSpy.mockRestore();
    });

    it("onDragStart returns early if card visual is not in the source pile visual's array", () => {
      const tableau0 = boardScene.tableauPiles[0];
      const visual0 = tableau0.playingCardVisuals[0];
      const originalVisuals = tableau0.playingCardVisuals;
      tableau0.playingCardVisuals = [];

      (boardScene.input as unknown as MockInput)._trigger(
        "dragstart",
        {},
        visual0.sprite,
      );

      expect(boardScene["draggedStack"].length).toBe(0);
      tableau0.playingCardVisuals = originalVisuals;
    });

    it("onDrag returns early if draggedStack is empty", () => {
      const tableau0 = boardScene.tableauPiles[0];
      const visual0 = tableau0.playingCardVisuals[0];
      const sprite0 = visual0.sprite;
      const initialPos = { x: sprite0.x, y: sprite0.y };

      boardScene["draggedStack"] = [];

      (boardScene.input as unknown as MockInput)._trigger(
        "drag",
        {},
        sprite0,
        999,
        999,
      );

      expect(sprite0.x).toBe(initialPos.x);
      expect(sprite0.y).toBe(initialPos.y);
    });

    it("onDragEnd returns early if draggedStack is empty", () => {
      const tableau0 = boardScene.tableauPiles[0];
      const visual0 = tableau0.playingCardVisuals[0];
      const sprite0 = visual0.sprite;

      boardScene["draggedStack"] = [];
      const layoutSpy = vi.spyOn(
        boardScene["layoutManager"],
        "updateVisualLayout",
      );

      (boardScene.input as unknown as MockInput)._trigger(
        "dragend",
        {},
        sprite0,
      );

      expect(layoutSpy).not.toHaveBeenCalled();
    });

    it("snaps cards back to layout if drop is on a pile but move is invalid", () => {
      const tableau0 = boardScene.tableauPiles[0];
      const visual0 = tableau0.playingCardVisuals[0];
      const sprite0 = visual0.sprite;
      sprite0.x = 50;
      sprite0.y = 100;

      const targetPile = boardScene.tableauPiles[1];
      targetPile.position = { x: 150, y: 250 };

      (boardScene.input as unknown as MockInput)._trigger(
        "dragstart",
        {},
        sprite0,
      );
      (boardScene.input as unknown as MockInput)._trigger(
        "drag",
        {},
        sprite0,
        150,
        250,
      );

      const moveSpy = vi
        .spyOn(boardScene.gameModel, "moveCardToPile")
        .mockReturnValue(false);
      const layoutSpy = vi.spyOn(
        boardScene["layoutManager"],
        "updateVisualLayout",
      );

      (boardScene.input as unknown as MockInput)._trigger(
        "dragend",
        {},
        sprite0,
      );

      expect(moveSpy).toHaveBeenCalled();
      expect(layoutSpy).toHaveBeenCalled();
      moveSpy.mockRestore();
    });
  });

  it("syncVisualPilesWithModel ignores cards not in cardVisualsMap", () => {
    const customBoardScene = new BoardScene();
    customBoardScene.create();

    const stockCard = customBoardScene.gameModel.stock.getCards()[0];
    customBoardScene["cardVisualsMap"].delete(stockCard.id);

    const wasteCard = customBoardScene.gameModel.stock.getCards()[1];
    customBoardScene.gameModel.stock.removeCard(wasteCard);
    customBoardScene.gameModel.waste.addCard(wasteCard);
    customBoardScene["cardVisualsMap"].delete(wasteCard.id);

    const fCard = customBoardScene.gameModel.stock.getCards()[2];
    customBoardScene.gameModel.stock.removeCard(fCard);
    customBoardScene.gameModel.foundations[0].addCard(fCard);
    customBoardScene["cardVisualsMap"].delete(fCard.id);

    const tCard =
      customBoardScene.tableauPiles[0].playingCardVisuals[0].playingCard;
    customBoardScene["cardVisualsMap"].delete(tCard.id);

    expect(() => {
      customBoardScene["syncVisualPilesWithModel"]();
    }).not.toThrow();
  });

  it("updateCardCursors handles stockPile.sprite or its input being null", () => {
    const originalSprite = boardScene.stockPile.sprite;

    boardScene.stockPile.sprite = null as any;
    expect(() => boardScene["updateCardCursors"]()).not.toThrow();

    boardScene.stockPile.sprite = { input: null } as any;
    expect(() => boardScene["updateCardCursors"]()).not.toThrow();

    boardScene.stockPile.sprite = originalSprite;
  });

  it("does not highlight empty stock background if sprite is inactive", () => {
    const bgSprite = boardScene.stockPile.sprite;
    const originalGraphics = boardScene["highlightGraphics"];

    boardScene.stockPile.value.clear();
    boardScene.gameModel.emit("card-moved");

    bgSprite.emit("pointerover");
    originalGraphics.strokeRoundedRect.mockClear();
    bgSprite.active = false;

    boardScene.updateHighlightBorder();

    expect(originalGraphics.strokeRoundedRect).not.toHaveBeenCalled();
    bgSprite.active = true;
  });
});
