import { vi, describe, it, expect, beforeEach } from "vitest";
import { BoardScene } from "../../../src/render/scene/board_scene";
import { SolitaireGame } from "../../../src/model/game/solitaire_game";
import {
  Suit,
  Type,
  ALL_PLAYING_CARD_IDS,
} from "../../../src/model/card/playing_card";

// Mock phaser entirely
vi.mock("phaser", () => {
  const createMockSprite = () => {
    const listeners: { [event: string]: Function[] } = {};
    const sprite = {
      setOrigin: vi.fn().mockReturnThis(),
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
      setFrame: vi.fn().mockReturnThis(),
      setPosition: vi.fn().mockReturnThis(),
      setScale: vi.fn().mockReturnThis(),
      setDepth: vi.fn().mockReturnThis(),
      displayWidth: 220,
      displayHeight: 307,
      input: undefined as any,
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
    (boardScene as any).gameModel.emit("card-flipped", {
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
    const scaleOnCalls = (boardScene.scale.on as any).mock.calls;
    const resizeCall = scaleOnCalls.find((call: any) => call[0] === "resize");
    expect(resizeCall).toBeDefined();

    const resizeCallback = resizeCall[1];

    // Act
    resizeCallback();

    // Assert
    expect(boardScene.stockPile.position).toEqual({ x: 20, y: 20 });
  });

  it("syncs visual piles and updates highlight on card-moved event", () => {
    const game = (boardScene as any).gameModel;
    const updateHighlightSpy = vi.spyOn(boardScene, "updateHighlightBorder");

    expect(boardScene.stockPile.playingCardVisuals.length).toBeGreaterThan(0);
    game.stock.clear();

    game.emit("card-moved");

    expect(boardScene.stockPile.playingCardVisuals.length).toBe(0);
    expect(updateHighlightSpy).toHaveBeenCalled();
  });

  it("syncs visual piles and updates highlight on stock-recycled event", () => {
    const game = (boardScene as any).gameModel;
    const updateHighlightSpy = vi.spyOn(boardScene, "updateHighlightBorder");

    expect(boardScene.stockPile.playingCardVisuals.length).toBeGreaterThan(0);
    game.stock.clear();

    game.emit("stock-recycled");

    expect(boardScene.stockPile.playingCardVisuals.length).toBe(0);
    expect(updateHighlightSpy).toHaveBeenCalled();
  });

  it("logs a message on game-won event", () => {
    const game = (boardScene as any).gameModel;
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    game.emit("game-won");

    expect(consoleLogSpy).toHaveBeenCalledWith("Congratulations! You won!");
    consoleLogSpy.mockRestore();
  });

  it("updates card sprite frame to card ID on card-flipped event (faceUp true)", () => {
    const game = (boardScene as any).gameModel;
    const tableau0 = boardScene.tableauPiles[0];
    const visual0 = tableau0.playingCardVisuals[0];
    const setFrameSpy = vi.spyOn(visual0.sprite, "setFrame");

    game.emit("card-flipped", { cardId: visual0.playingCard.id, faceUp: true });

    expect(setFrameSpy).toHaveBeenCalledWith(visual0.playingCard.id);
  });

  it("updates card sprite frame to card-back-blue on card-flipped event (faceUp false)", () => {
    const game = (boardScene as any).gameModel;
    const tableau0 = boardScene.tableauPiles[0];
    const visual0 = tableau0.playingCardVisuals[0];
    const setFrameSpy = vi.spyOn(visual0.sprite, "setFrame");

    game.emit("card-flipped", {
      cardId: visual0.playingCard.id,
      faceUp: false,
    });

    expect(setFrameSpy).toHaveBeenCalledWith("card-back-blue");
  });

  it("does not crash on card-flipped event if card visual lacks a sprite", () => {
    const game = (boardScene as any).gameModel;
    const tableau0 = boardScene.tableauPiles[0];
    const visual0 = tableau0.playingCardVisuals[0];
    const oldSprite = visual0.sprite;
    (visual0 as any).sprite = null;

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
    const originalGraphics = (boardScene as any).highlightGraphics;
    originalGraphics.strokeRoundedRect.mockClear();

    sprite.emit("pointerover");

    expect(originalGraphics.strokeRoundedRect).toHaveBeenCalled();
  });

  it("clears highlight on card pointerout", () => {
    const tableau0 = boardScene.tableauPiles[0];
    const visual0 = tableau0.playingCardVisuals[0];
    const sprite = visual0.sprite;
    const originalGraphics = (boardScene as any).highlightGraphics;
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

    const originalGraphics = (boardScene as any).highlightGraphics;

    sprite.emit("pointerout");

    originalGraphics.strokeRoundedRect.mockClear();
    boardScene.updateHighlightBorder();
    expect(originalGraphics.strokeRoundedRect).toHaveBeenCalled();
  });

  it("draws card on pointerdown of top stock card", () => {
    const stockVisual = boardScene.stockPile.playingCardVisuals[23];
    const stockSprite = stockVisual.sprite;
    const drawSpy = vi.spyOn(SolitaireGame.prototype, "drawCardsFromStock");

    stockSprite.emit("pointerdown");

    expect(drawSpy).toHaveBeenCalled();
    drawSpy.mockRestore();
  });

  it("does not draw card on pointerdown of non-top stock card", () => {
    const nonTopStockVisual = boardScene.stockPile.playingCardVisuals[0];
    const nonTopStockSprite = nonTopStockVisual.sprite;
    const drawSpy = vi.spyOn(SolitaireGame.prototype, "drawCardsFromStock");

    nonTopStockSprite.emit("pointerdown");

    expect(drawSpy).not.toHaveBeenCalled();
    drawSpy.mockRestore();
  });

  it("recycles stock on pointerdown of stock background when stock is empty", () => {
    boardScene.stockPile.value.clear();
    const bgSprite = boardScene.stockPile.sprite;
    const drawSpy = vi.spyOn(SolitaireGame.prototype, "drawCardsFromStock");

    bgSprite.emit("pointerdown");

    expect(drawSpy).toHaveBeenCalled();
    drawSpy.mockRestore();
  });

  it("does not recycle stock on pointerdown of stock background when stock is not empty", () => {
    const bgSprite = boardScene.stockPile.sprite;
    const drawSpy = vi.spyOn(SolitaireGame.prototype, "drawCardsFromStock");

    bgSprite.emit("pointerdown");

    expect(drawSpy).not.toHaveBeenCalled();
    drawSpy.mockRestore();
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
    const tableauVisual = boardScene.tableauPiles[0].playingCardVisuals[0];
    const drawSpy = vi.spyOn(SolitaireGame.prototype, "drawCardsFromStock");

    tableauVisual.sprite.emit("pointerdown");

    expect(drawSpy).not.toHaveBeenCalled();
    drawSpy.mockRestore();
  });

  it("does not crash when highlightGraphics is null", () => {
    const originalGraphics = (boardScene as any).highlightGraphics;
    (boardScene as any).highlightGraphics = null;

    expect(() => boardScene.updateHighlightBorder()).not.toThrow();
    (boardScene as any).highlightGraphics = originalGraphics;
  });

  it("clears highlight when hoveredCardVisual is null", () => {
    const originalGraphics = (boardScene as any).highlightGraphics;
    originalGraphics.clear.mockClear();

    boardScene.updateHighlightBorder();

    expect(originalGraphics.clear).toHaveBeenCalled();
  });

  it("does not draw border if hoveredCardVisual is not interactable", () => {
    const originalGraphics = (boardScene as any).highlightGraphics;
    const visual = boardScene.tableauPiles[1].playingCardVisuals[0];
    expect(visual.playingCard.faceUp).toBe(false);

    visual.sprite.emit("pointerover");
    originalGraphics.strokeRoundedRect.mockClear();

    boardScene.updateHighlightBorder();

    expect(originalGraphics.strokeRoundedRect).not.toHaveBeenCalled();
  });

  it("does not draw border if hoveredCardVisual sprite is inactive", () => {
    const originalGraphics = (boardScene as any).highlightGraphics;
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
    const originalGraphics = (boardScene as any).highlightGraphics;
    const tableau0 = boardScene.tableauPiles[0];
    const visual = tableau0.playingCardVisuals[0];

    visual.sprite.emit("pointerover");
    originalGraphics.strokeRoundedRect.mockClear();

    boardScene.updateHighlightBorder();

    expect(originalGraphics.strokeRoundedRect).toHaveBeenCalled();
  });

  it("updates cursor and hover state on non-empty stock background hover", () => {
    const bgSprite = boardScene.stockPile.sprite;
    const originalGraphics = (boardScene as any).highlightGraphics;
    originalGraphics.strokeRoundedRect.mockClear();

    bgSprite.emit("pointerover");

    expect(bgSprite.input.cursor).toBe("default");
    boardScene.updateHighlightBorder();
    expect(originalGraphics.strokeRoundedRect).not.toHaveBeenCalled();
  });

  it("updates cursor, hover state, and highlights empty stock background hover", () => {
    const bgSprite = boardScene.stockPile.sprite;
    const originalGraphics = (boardScene as any).highlightGraphics;

    boardScene.stockPile.value.clear();
    (boardScene as any).gameModel.emit("card-moved");
    originalGraphics.strokeRoundedRect.mockClear();

    bgSprite.emit("pointerover");

    expect(bgSprite.input.cursor).toBe("pointer");
    boardScene.updateHighlightBorder();
    expect(originalGraphics.strokeRoundedRect).toHaveBeenCalled();
  });

  it("clears hover state and highlight on pointerout of empty stock background", () => {
    const bgSprite = boardScene.stockPile.sprite;
    const originalGraphics = (boardScene as any).highlightGraphics;

    boardScene.stockPile.value.clear();
    (boardScene as any).gameModel.emit("card-moved");
    bgSprite.emit("pointerover");
    originalGraphics.strokeRoundedRect.mockClear();

    bgSprite.emit("pointerout");

    boardScene.updateHighlightBorder();
    expect(originalGraphics.strokeRoundedRect).not.toHaveBeenCalled();
  });

  it("throws error during creation if a card has an invalid suit", () => {
    const invalidCard = { suit: 999 as any, type: Type.ACE };
    ALL_PLAYING_CARD_IDS.push(invalidCard);

    expect(() => {
      boardScene.create();
    }).toThrow("Unknown Suit: 999");

    ALL_PLAYING_CARD_IDS.pop();
  });

  it("throws error during creation if a card has an invalid type", () => {
    const invalidTypeCard = { suit: Suit.SPADE, type: 999 as any };
    ALL_PLAYING_CARD_IDS.push(invalidTypeCard);

    expect(() => {
      boardScene.create();
    }).toThrow("Unknown Type: 999");

    ALL_PLAYING_CARD_IDS.pop();
  });
});
