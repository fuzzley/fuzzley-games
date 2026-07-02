import { vi, describe, it, expect, beforeEach } from "vitest";
import { BoardScene } from "../../../src/render/scene/board_scene";
import {
  PlayingCard,
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

describe("BoardScene - isCardInteractable", () => {
  let boardScene: BoardScene;

  beforeEach(() => {
    boardScene = new BoardScene();
    boardScene.create();
  });

  it("handles tableau piles correctly: face-up is interactable, face-down is not", () => {
    // Grab the first tableau pile visual cards
    // The game deals 1 card to tableau-0 (face up)
    const tableau0 = boardScene.tableauPiles[0];
    expect(tableau0.playingCardVisuals.length).toBe(1);

    const card = tableau0.playingCardVisuals[0].playingCard;
    expect(card.faceUp).toBe(true);
    expect(boardScene.isCardInteractable(card)).toBe(true);

    // Turn face-down
    card.faceUp = false;
    expect(boardScene.isCardInteractable(card)).toBe(false);

    // Tableau 1 gets 2 cards (first face-down, second face-up)
    const tableau1 = boardScene.tableauPiles[1];
    expect(tableau1.playingCardVisuals.length).toBe(2);

    const cardBottom = tableau1.playingCardVisuals[0].playingCard;
    const cardTop = tableau1.playingCardVisuals[1].playingCard;

    expect(cardBottom.faceUp).toBe(false);
    expect(cardTop.faceUp).toBe(true);

    expect(boardScene.isCardInteractable(cardBottom)).toBe(false);
    expect(boardScene.isCardInteractable(cardTop)).toBe(true);
  });

  it("handles waste pile correctly: only top card is interactable", () => {
    // Waste is initially empty
    expect(boardScene.wastePile.playingCardVisuals.length).toBe(0);

    const card1 = new PlayingCard();
    card1.id = "card-spades-2";
    card1.faceUp = true;
    const card2 = new PlayingCard();
    card2.id = "card-hearts-king";
    card2.faceUp = true;

    // Manually add to waste model and sync
    const game = (boardScene as any).gameModel;
    game.waste.addCard(card1);
    game.waste.addCard(card2);

    // Registers cards in gameModel map so getPileContainingCard works
    game.allCardsMap.set(card1.id, card1);
    game.allCardsMap.set(card2.id, card2);

    (boardScene as any).syncVisualPilesWithModel();

    // Verify waste counts
    expect(boardScene.wastePile.playingCardVisuals.length).toBe(2);

    // Top card (card2) should be interactable
    expect(boardScene.isCardInteractable(card2)).toBe(true);
    // Non-top card (card1) should NOT be interactable
    expect(boardScene.isCardInteractable(card1)).toBe(false);
  });

  it("handles foundation piles correctly: only top card is interactable", () => {
    // Foundation 0 is initially empty
    const foundation0 = boardScene.foundationPiles[0];
    expect(foundation0.playingCardVisuals.length).toBe(0);

    const card1 = new PlayingCard();
    card1.id = "card-diamonds-ace";
    card1.faceUp = true;
    const card2 = new PlayingCard();
    card2.id = "card-diamonds-2";
    card2.faceUp = true;

    const game = (boardScene as any).gameModel;
    game.foundations[0].addCard(card1);
    game.foundations[0].addCard(card2);

    game.allCardsMap.set(card1.id, card1);
    game.allCardsMap.set(card2.id, card2);

    (boardScene as any).syncVisualPilesWithModel();

    expect(foundation0.playingCardVisuals.length).toBe(2);

    // Top card should be interactable
    expect(boardScene.isCardInteractable(card2)).toBe(true);
    // Non-top card should NOT be interactable
    expect(boardScene.isCardInteractable(card1)).toBe(false);
  });

  it("handles stock pile correctly: only the top card is interactable", () => {
    // Stock has 24 cards
    expect(boardScene.stockPile.playingCardVisuals.length).toBe(24);

    const nonTopCard = boardScene.stockPile.playingCardVisuals[0].playingCard;
    expect(boardScene.isCardInteractable(nonTopCard)).toBe(false);

    const topCard = boardScene.stockPile.playingCardVisuals[23].playingCard;
    expect(boardScene.isCardInteractable(topCard)).toBe(true);
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

    // After flipping the top card of tableau 0 face down and calling updateCardCursors, it should become 'default'
    const card0 = cardVisual0.playingCard;
    card0.faceUp = false;
    (boardScene as any).updateCardCursors();
    expect(cardVisual0.sprite.input.cursor).toBe("default");
  });

  it("getPileVisualById returns the pile or null if not found", () => {
    expect(boardScene.getPileVisualById("stock")).toBe(boardScene.stockPile);
    expect(boardScene.getPileVisualById("non-existent-pile")).toBeNull();
  });

  it("triggers layout updates when the scale resize event fires", () => {
    const layoutManager = (boardScene as any).layoutManager;
    const createLayoutSpy = vi.spyOn(layoutManager, "createInitialLayout");
    const updateLayoutSpy = vi.spyOn(layoutManager, "updateVisualLayout");

    // Retrieve and call the registered callback
    const scaleOnCalls = (boardScene.scale.on as any).mock.calls;
    const resizeCall = scaleOnCalls.find((call: any) => call[0] === "resize");
    expect(resizeCall).toBeDefined();

    const resizeCallback = resizeCall[1];
    resizeCallback();

    expect(createLayoutSpy).toHaveBeenCalled();
    expect(updateLayoutSpy).toHaveBeenCalled();
  });

  it("handles card-moved, card-flipped, stock-recycled, and game-won event callbacks", () => {
    const game = (boardScene as any).gameModel;
    const syncSpy = vi.spyOn(boardScene as any, "syncVisualPilesWithModel");
    const updateHighlightSpy = vi.spyOn(boardScene, "updateHighlightBorder");
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Trigger card-moved
    game.emit("card-moved");
    expect(syncSpy).toHaveBeenCalled();
    expect(updateHighlightSpy).toHaveBeenCalled();

    // Trigger stock-recycled
    syncSpy.mockClear();
    updateHighlightSpy.mockClear();
    game.emit("stock-recycled");
    expect(syncSpy).toHaveBeenCalled();
    expect(updateHighlightSpy).toHaveBeenCalled();

    // Trigger game-won
    game.emit("game-won");
    expect(consoleLogSpy).toHaveBeenCalledWith("Congratulations! You won!");
    consoleLogSpy.mockRestore();

    // Trigger card-flipped
    // 1. With visual card that has a sprite, faceUp true
    const tableau0 = boardScene.tableauPiles[0];
    const visual0 = tableau0.playingCardVisuals[0];
    const setFrameSpy = vi.spyOn(visual0.sprite, "setFrame");
    game.emit("card-flipped", { cardId: visual0.playingCard.id, faceUp: true });
    expect(setFrameSpy).toHaveBeenCalledWith(visual0.playingCard.id);

    // 2. With visual card that has a sprite, faceUp false
    setFrameSpy.mockClear();
    game.emit("card-flipped", {
      cardId: visual0.playingCard.id,
      faceUp: false,
    });
    expect(setFrameSpy).toHaveBeenCalledWith("card-back-blue");

    // 3. With visual card that doesn't have sprite (should not crash)
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
    const badGameModel = new (boardScene as any).gameModel.constructor();
    vi.spyOn(badGameModel, "getCardById").mockReturnValue(undefined);
    (customBoardScene as any).gameModel = badGameModel;
    expect(() => customBoardScene.create()).toThrow(
      "Card model not found for: ",
    );
  });

  it("updates hoveredCardVisual and highlights on pointerover / pointerout", () => {
    const tableau0 = boardScene.tableauPiles[0];
    const visual0 = tableau0.playingCardVisuals[0];
    const sprite = visual0.sprite;

    expect((boardScene as any).hoveredCardVisual).toBeNull();

    // Emit pointerover
    sprite.emit("pointerover");
    expect((boardScene as any).hoveredCardVisual).toBe(visual0);

    // Emit pointerout on same visual
    sprite.emit("pointerout");
    expect((boardScene as any).hoveredCardVisual).toBeNull();

    // Emit pointerout on different visual when not hovered
    sprite.emit("pointerover");
    (boardScene as any).hoveredCardVisual = { playingCard: {} } as any; // mock another visual
    sprite.emit("pointerout");
    expect((boardScene as any).hoveredCardVisual).not.toBeNull(); // should not be cleared
  });

  it("handles pointerdown on card sprite and stock/recycle background sprite", () => {
    // 1. Pointerdown on the top card in stock pile (should draw card)
    const stockVisual = boardScene.stockPile.playingCardVisuals[23];
    const stockSprite = stockVisual.sprite;
    const drawSpy = vi.spyOn(
      (boardScene as any).gameModel,
      "drawCardsFromStock",
    );

    stockSprite.emit("pointerdown");
    expect(drawSpy).toHaveBeenCalled();

    // 2. Pointerdown on a non-top card in stock pile (should NOT draw card)
    drawSpy.mockClear();
    const nonTopStockVisual = boardScene.stockPile.playingCardVisuals[0];
    const nonTopStockSprite = nonTopStockVisual.sprite;
    nonTopStockSprite.emit("pointerdown");
    expect(drawSpy).not.toHaveBeenCalled();

    // 3. Pointerdown on stock pile background placeholder when stock is empty (should recycle/draw)
    drawSpy.mockClear();
    const getCardsSpy = vi
      .spyOn((boardScene as any).gameModel.stock, "getCards")
      .mockReturnValue([]);
    const bgSprite = boardScene.stockPile.sprite;
    bgSprite.emit("pointerdown");
    expect(drawSpy).toHaveBeenCalled();
    getCardsSpy.mockRestore();

    // 4. Pointerdown on stock pile background placeholder when stock is NOT empty (should NOT draw/recycle)
    drawSpy.mockClear();
    bgSprite.emit("pointerdown");
    expect(drawSpy).not.toHaveBeenCalled();

    // 5. Pointerdown on card not in any pile (should throw error)
    const ghostCardVisual = boardScene.tableauPiles[0].playingCardVisuals[0];
    const getPileSpy = vi
      .spyOn((boardScene as any).gameModel, "getPileContainingCard")
      .mockReturnValue(undefined);
    expect(() => {
      ghostCardVisual.sprite.emit("pointerdown");
    }).toThrow(/is not in a pile/);
    getPileSpy.mockRestore();

    // 6. Pointerdown on a card in a tableau pile (pile.id !== "stock" to cover else branch)
    drawSpy.mockClear();
    const tableauVisual = boardScene.tableauPiles[0].playingCardVisuals[0];
    tableauVisual.sprite.emit("pointerdown");
    expect(drawSpy).not.toHaveBeenCalled();
  });

  it("handles isCardInteractable boundary cases", () => {
    const card = new PlayingCard();
    card.id = "ghost-card";

    // Card not in a pile
    expect(boardScene.isCardInteractable(card)).toBe(false);

    // Card in an unknown/arbitrary pile type
    const game = (boardScene as any).gameModel;
    game.allCardsMap.set(card.id, card);
    const mockPile = { id: "unknown-pile-id", getCards: () => [card] };
    vi.spyOn(game, "getPileContainingCard").mockReturnValue(mockPile as any);

    expect(boardScene.isCardInteractable(card)).toBe(false);
  });

  it("handles updateHighlightBorder boundary cases", () => {
    // 1. highlightGraphics is null
    const originalGraphics = (boardScene as any).highlightGraphics;
    (boardScene as any).highlightGraphics = null;
    expect(() => boardScene.updateHighlightBorder()).not.toThrow();
    (boardScene as any).highlightGraphics = originalGraphics;

    // 2. hoveredCardVisual is null
    (boardScene as any).hoveredCardVisual = null;
    originalGraphics.clear.mockClear();
    boardScene.updateHighlightBorder();
    expect(originalGraphics.clear).toHaveBeenCalled(); // should clear and return early

    // 3. hoveredCardVisual is not interactable
    const tableau0 = boardScene.tableauPiles[0];
    const visual = tableau0.playingCardVisuals[0];
    visual.playingCard.faceUp = false; // not interactable
    (boardScene as any).hoveredCardVisual = visual;
    boardScene.updateHighlightBorder();
    expect(originalGraphics.strokeRoundedRect).not.toHaveBeenCalled();

    // 4. hoveredCardVisual sprite is inactive
    visual.playingCard.faceUp = true; // interactable
    visual.sprite.active = false; // inactive sprite
    boardScene.updateHighlightBorder();
    expect(originalGraphics.strokeRoundedRect).not.toHaveBeenCalled();

    // 5. Normal border drawing
    visual.sprite.active = true;
    boardScene.updateHighlightBorder();
    expect(originalGraphics.strokeRoundedRect).toHaveBeenCalled();
  });

  it("throws errors in suitToFileName and typeToFileName for invalid values", () => {
    // We import ALL_PLAYING_CARD_IDS and can mutate it temporarily
    // Create card with invalid suit
    const invalidCard = { suit: 999 as any, type: Type.ACE };
    ALL_PLAYING_CARD_IDS.push(invalidCard);

    expect(() => {
      boardScene.create();
    }).toThrow("Unknown Suit: 999");

    // Clean up invalid card from array
    ALL_PLAYING_CARD_IDS.pop();

    // Create card with invalid type
    const invalidTypeCard = { suit: Suit.SPADE, type: 999 as any };
    ALL_PLAYING_CARD_IDS.push(invalidTypeCard);

    expect(() => {
      boardScene.create();
    }).toThrow("Unknown Type: 999");

    ALL_PLAYING_CARD_IDS.pop();
  });
});
