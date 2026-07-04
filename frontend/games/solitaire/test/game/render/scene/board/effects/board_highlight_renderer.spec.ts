import { vi, describe, it, expect, beforeEach } from "vitest";
import * as Phaser from "phaser";
import { BoardHighlightRenderer } from "@/game/render/scene/board/effects/board_highlight_renderer";
import { SolitaireGame } from "@/game/model/game/solitaire_game";
import { PlayingCardVisual } from "@/game/render/visual/card/playing_card_visual";

describe("BoardHighlightRenderer", () => {
  let mockGraphics: any;
  let mockBoardScene: any;
  let gameModel: SolitaireGame;
  let renderer: BoardHighlightRenderer;

  beforeEach(() => {
    mockGraphics = {
      clear: vi.fn().mockReturnThis(),
      lineStyle: vi.fn().mockReturnThis(),
      strokeRoundedRect: vi.fn().mockReturnThis(),
      setDepth: vi.fn().mockReturnThis(),
    };

    gameModel = new SolitaireGame();
    // Start game so that stock isn't empty, tableaus are populated, etc.
    gameModel.startNewGame();

    mockBoardScene = {
      add: {
        graphics: vi.fn().mockReturnValue(mockGraphics),
      },
      gameModel,
      stockPile: {
        sprite: {
          active: true,
          displayWidth: 100,
          displayHeight: 150,
          x: 20,
          y: 20,
        },
      },
      getLayoutManager: () => ({
        getScaleFactor: () => 1.5,
      }),
    };

    renderer = new BoardHighlightRenderer(mockBoardScene);
  });

  it("does not crash when graphics is null", () => {
    // Arrange
    renderer.graphics = null as unknown as Phaser.GameObjects.Graphics;

    // Act & Assert
    expect(() => renderer.update(null, false, false)).not.toThrow();
  });

  it("clears graphics and returns early when dragging", () => {
    // Act
    renderer.update(null, false, true);

    // Assert
    expect(mockGraphics.clear).toHaveBeenCalled();
    expect(mockGraphics.strokeRoundedRect).not.toHaveBeenCalled();
  });

  it("highlights stock background if stock is empty and stock background is hovered", () => {
    // Arrange
    gameModel.stock.clear(); // Empty the stock

    // Act
    renderer.update(null, true, false);

    // Assert
    expect(mockGraphics.clear).toHaveBeenCalled();
    expect(mockGraphics.lineStyle).toHaveBeenCalledWith(9 * 1.5, 0xebef9b, 0.9);
    expect(mockGraphics.strokeRoundedRect).toHaveBeenCalledWith(
      20,
      20,
      100,
      150,
      12 * 1.5,
    );
  });

  it("does not highlight stock background if stock background is hovered but stock is not empty", () => {
    // Act
    renderer.update(null, true, false);

    // Assert
    expect(mockGraphics.clear).toHaveBeenCalled();
    expect(mockGraphics.strokeRoundedRect).not.toHaveBeenCalled();
  });

  it("does not highlight empty stock background if sprite is inactive", () => {
    // Arrange
    gameModel.stock.clear();
    mockBoardScene.stockPile.sprite.active = false;

    // Act
    renderer.update(null, true, false);

    // Assert
    expect(mockGraphics.clear).toHaveBeenCalled();
    expect(mockGraphics.strokeRoundedRect).not.toHaveBeenCalled();
  });

  it("does nothing if no card is hovered", () => {
    // Act
    renderer.update(null, false, false);

    // Assert
    expect(mockGraphics.clear).toHaveBeenCalled();
    expect(mockGraphics.strokeRoundedRect).not.toHaveBeenCalled();
  });

  it("does nothing if hovered card is not interactable", () => {
    // Arrange
    // Grab a face-down card from tableau 1 (index 0 is face down in standard game setup)
    const faceDownCard = gameModel.tableaus[1].getCards()[0];
    expect(gameModel.isCardInteractable(faceDownCard)).toBe(false);

    const mockSprite = {
      active: true,
      displayWidth: 100,
      displayHeight: 150,
      x: 50,
      y: 50,
    };
    const visual = new PlayingCardVisual(faceDownCard);
    visual.sprite = mockSprite as unknown as Phaser.GameObjects.Sprite;

    // Act
    renderer.update(visual, false, false);

    // Assert
    expect(mockGraphics.clear).toHaveBeenCalled();
    expect(mockGraphics.strokeRoundedRect).not.toHaveBeenCalled();
  });

  it("does nothing if hovered card sprite is inactive", () => {
    // Arrange
    // Grab an interactable card (e.g. face up top card in tableau 0)
    const interactableCard = gameModel.tableaus[0].getCards()[0];
    expect(gameModel.isCardInteractable(interactableCard)).toBe(true);

    const mockSprite = {
      active: false,
      displayWidth: 100,
      displayHeight: 150,
      x: 50,
      y: 50,
    };
    const visual = new PlayingCardVisual(interactableCard);
    visual.sprite = mockSprite as unknown as Phaser.GameObjects.Sprite;

    // Act
    renderer.update(visual, false, false);

    // Assert
    expect(mockGraphics.clear).toHaveBeenCalled();
    expect(mockGraphics.strokeRoundedRect).not.toHaveBeenCalled();
  });

  it("draws highlight border for an interactable active hovered card", () => {
    // Arrange
    const interactableCard = gameModel.tableaus[0].getCards()[0];
    expect(gameModel.isCardInteractable(interactableCard)).toBe(true);

    const mockSprite = {
      active: true,
      displayWidth: 100,
      displayHeight: 150,
      x: 50,
      y: 50,
    };
    const visual = new PlayingCardVisual(interactableCard);
    visual.sprite = mockSprite as unknown as Phaser.GameObjects.Sprite;

    // Act
    renderer.update(visual, false, false);

    // Assert
    expect(mockGraphics.clear).toHaveBeenCalled();
    expect(mockGraphics.lineStyle).toHaveBeenCalledWith(9 * 1.5, 0xebef9b, 0.9);
    expect(mockGraphics.strokeRoundedRect).toHaveBeenCalledWith(
      50,
      50,
      100,
      150,
      12 * 1.5,
    );
  });
});
