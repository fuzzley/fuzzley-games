import { vi, describe, it, expect, beforeEach } from "vitest";
import * as Phaser from "phaser";
import { BoardInputManager } from "../../../../../src/render/scene/board/input/board_input_manager";
import { SolitaireGame } from "../../../../../src/model/game/solitaire_game";
import { PlayingCardVisual } from "../../../../../src/render/visual/card/playing_card_visual";
import { StockPileVisual } from "../../../../../src/render/visual/pile/stock_pile_visual";
import { TableauPileVisual } from "../../../../../src/render/visual/pile/tableau_pile_visual";
import { FoundationPileVisual } from "../../../../../src/render/visual/pile/foundation_pile_visual";
import { BoardScene } from "../../../../../src/render/scene/board/board_scene";

// Mock phaser entirely
vi.mock("phaser", () => {
  return {
    Scene: class MockScene {},
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

describe("BoardInputManager", () => {
  let mockSceneListeners: { [event: string]: Function };
  let mockBoardScene: BoardScene;
  let gameModel: SolitaireGame;
  let inputManager: BoardInputManager;

  beforeEach(() => {
    mockSceneListeners = {};
    gameModel = new SolitaireGame();
    gameModel.startNewGame();

    const mockLayoutManager = {
      getScaleFactor: () => 1.0,
      updateVisualLayout: vi.fn(),
    };

    mockBoardScene = {
      input: {
        on: vi.fn().mockImplementation((event: string, cb: Function) => {
          mockSceneListeners[event] = cb;
        }),
        setDraggable: vi.fn(),
      },
      gameModel,
      stockPile: new StockPileVisual(gameModel.stock),
      wastePile: new StockPileVisual(gameModel.waste),
      foundationPiles: [
        new FoundationPileVisual(gameModel.foundations[0]),
        new FoundationPileVisual(gameModel.foundations[1]),
        new FoundationPileVisual(gameModel.foundations[2]),
        new FoundationPileVisual(gameModel.foundations[3]),
      ],
      tableauPiles: [
        new TableauPileVisual(gameModel.tableaus[0]),
        new TableauPileVisual(gameModel.tableaus[1]),
        new TableauPileVisual(gameModel.tableaus[2]),
        new TableauPileVisual(gameModel.tableaus[3]),
        new TableauPileVisual(gameModel.tableaus[4]),
        new TableauPileVisual(gameModel.tableaus[5]),
        new TableauPileVisual(gameModel.tableaus[6]),
      ],
      getPileVisualById: vi.fn().mockImplementation((pileId: string) => {
        if (pileId === "stock") return mockBoardScene.stockPile;
        if (pileId === "waste") return mockBoardScene.wastePile;
        if (pileId.startsWith("tableau-")) {
          const index = parseInt(pileId.split("-")[1], 10);
          return mockBoardScene.tableauPiles[index];
        }
        if (pileId.startsWith("foundation-")) {
          const index = parseInt(pileId.split("-")[1], 10);
          return mockBoardScene.foundationPiles[index];
        }
        return null;
      }),
      updateHighlightBorder: vi.fn(),
      getLayoutManager: () => mockLayoutManager,
    } as unknown as BoardScene;

    // Helper to assign a mock sprite to the background of stock Pile
    mockBoardScene.stockPile.sprite = {
      active: true,
      displayWidth: 220,
      displayHeight: 307,
      x: 40,
      y: 40,
    } as unknown as Phaser.GameObjects.Sprite;

    inputManager = new BoardInputManager(mockBoardScene);
  });

  describe("Drag Listener Registration", () => {
    it("registers drag event listeners on input system", () => {
      // Act
      inputManager.registerDragListeners();

      // Assert
      expect(mockBoardScene.input.on).toHaveBeenCalledWith(
        "dragstart",
        expect.any(Function),
      );
      expect(mockBoardScene.input.on).toHaveBeenCalledWith(
        "drag",
        expect.any(Function),
      );
      expect(mockBoardScene.input.on).toHaveBeenCalledWith(
        "dragend",
        expect.any(Function),
      );
    });
  });

  describe("Card Interaction Listeners", () => {
    let mockSprite: any;
    let visualCard: PlayingCardVisual;

    beforeEach(() => {
      const card = gameModel.tableaus[0].getCards()[0];
      visualCard = new PlayingCardVisual(card);
      // Create mock sprite using the mocked phaser module via direct construction
      mockSprite = {
        on: vi.fn(),
        emit: vi.fn(),
      };
      visualCard.sprite = mockSprite;
      inputManager.registerCardListeners(mockSprite, visualCard);
    });

    it("registers pointerover, pointerout, pointerdown on sprite", () => {
      expect(mockSprite.on).toHaveBeenCalledWith(
        "pointerover",
        expect.any(Function),
      );
      expect(mockSprite.on).toHaveBeenCalledWith(
        "pointerout",
        expect.any(Function),
      );
      expect(mockSprite.on).toHaveBeenCalledWith(
        "pointerdown",
        expect.any(Function),
      );
    });

    it("pointerover sets hoveredCardVisual and updates highlight", () => {
      // Retrieve the callback passed to 'on' for 'pointerover'
      const pointerOverCb = mockSprite.on.mock.calls.find(
        (call: any) => call[0] === "pointerover",
      )[1];

      // Act
      pointerOverCb();

      // Assert
      expect(inputManager.hoveredCardVisual).toBe(visualCard);
      expect(mockBoardScene.updateHighlightBorder).toHaveBeenCalled();
    });

    it("pointerout clears hoveredCardVisual if it matches", () => {
      // Set initial hover state
      inputManager.hoveredCardVisual = visualCard;
      const pointerOutCb = mockSprite.on.mock.calls.find(
        (call: any) => call[0] === "pointerout",
      )[1];

      // Act
      pointerOutCb();

      // Assert
      expect(inputManager.hoveredCardVisual).toBeNull();
      expect(mockBoardScene.updateHighlightBorder).toHaveBeenCalled();
    });

    it("pointerout does not clear hoveredCardVisual if it is a different card", () => {
      // Arrange
      const anotherCard = gameModel.tableaus[1].getCards()[0];
      const anotherVisual = new PlayingCardVisual(anotherCard);
      inputManager.hoveredCardVisual = anotherVisual;
      const pointerOutCb = mockSprite.on.mock.calls.find(
        (call: any) => call[0] === "pointerout",
      )[1];

      // Act
      pointerOutCb();

      // Assert
      expect(inputManager.hoveredCardVisual).toBe(anotherVisual);
    });

    it("pointerdown on top stock card triggers drawing", () => {
      // Arrange
      const stockCards = gameModel.stock.getCards();
      const topStockCard = stockCards[stockCards.length - 1];
      const stockVisual = new PlayingCardVisual(topStockCard);
      const drawSprite: any = { on: vi.fn() };
      stockVisual.sprite = drawSprite;
      inputManager.registerCardListeners(drawSprite, stockVisual);

      const pointerDownCb = drawSprite.on.mock.calls.find(
        (call: any) => call[0] === "pointerdown",
      )[1];
      const initialStockSize = gameModel.stock.getCards().length;

      // Act
      pointerDownCb();

      // Assert
      expect(gameModel.stock.getCards().length).toBe(initialStockSize - 3);
      expect(gameModel.waste.getCards().length).toBe(3);
    });

    it("pointerdown on non-top stock card does not trigger drawing", () => {
      // Arrange
      const stockCards = gameModel.stock.getCards();
      const nonTopStockCard = stockCards[0];
      const stockVisual = new PlayingCardVisual(nonTopStockCard);
      const drawSprite: any = { on: vi.fn() };
      stockVisual.sprite = drawSprite;
      inputManager.registerCardListeners(drawSprite, stockVisual);

      const pointerDownCb = drawSprite.on.mock.calls.find(
        (call: any) => call[0] === "pointerdown",
      )[1];
      const initialStockSize = gameModel.stock.getCards().length;

      // Act
      pointerDownCb();

      // Assert
      expect(gameModel.stock.getCards().length).toBe(initialStockSize);
      expect(gameModel.waste.getCards().length).toBe(0);
    });

    it("pointerdown throws error if card is not in any pile", () => {
      // Arrange
      const card = gameModel.tableaus[0].getCards()[0];
      const ghostVisual = new PlayingCardVisual(card);
      const ghostSprite: any = { on: vi.fn() };
      ghostVisual.sprite = ghostSprite;
      // Remove card from game
      gameModel.tableaus[0].removeCard(card);

      inputManager.registerCardListeners(ghostSprite, ghostVisual);
      const pointerDownCb = ghostSprite.on.mock.calls.find(
        (call: any) => call[0] === "pointerdown",
      )[1];

      // Act & Assert
      expect(() => pointerDownCb()).toThrow(/is not in a pile/);
    });

    it("pointerdown on a tableau card does not trigger stock card drawing", () => {
      const initialStockSize = gameModel.stock.getCards().length;
      const pointerDownCb = mockSprite.on.mock.calls.find(
        (call: any) => call[0] === "pointerdown",
      )[1];

      // Act
      pointerDownCb();

      // Assert
      expect(gameModel.stock.getCards().length).toBe(initialStockSize);
      expect(gameModel.waste.getCards().length).toBe(0);
    });
  });

  describe("Stock Background Interaction", () => {
    let mockSprite: any;

    beforeEach(() => {
      mockSprite = {
        on: vi.fn(),
      };
      inputManager.registerStockBackgroundListeners(mockSprite);
    });

    it("registers pointerdown, pointerover, and pointerout on stock background", () => {
      expect(mockSprite.on).toHaveBeenCalledWith(
        "pointerdown",
        expect.any(Function),
      );
      expect(mockSprite.on).toHaveBeenCalledWith(
        "pointerover",
        expect.any(Function),
      );
      expect(mockSprite.on).toHaveBeenCalledWith(
        "pointerout",
        expect.any(Function),
      );
    });

    it("pointerdown recycles stock if stock is empty", () => {
      // Arrange
      gameModel.stock.clear();
      const card = gameModel.getCardById("card-clubs-ace")!;
      gameModel.getPileContainingCard(card.id)?.removeCard(card);
      gameModel.waste.addCard(card);
      const pointerDownCb = mockSprite.on.mock.calls.find(
        (call: any) => call[0] === "pointerdown",
      )[1];

      // Act
      pointerDownCb();

      // Assert
      expect(gameModel.stock.getCards().length).toBe(1);
      expect(gameModel.waste.getCards().length).toBe(0);
    });

    it("pointerdown does nothing on stock background if stock is not empty", () => {
      // Arrange
      const pointerDownCb = mockSprite.on.mock.calls.find(
        (call: any) => call[0] === "pointerdown",
      )[1];
      const initialStockSize = gameModel.stock.getCards().length;

      // Act
      pointerDownCb();

      // Assert
      expect(gameModel.stock.getCards().length).toBe(initialStockSize);
    });

    it("pointerover sets isStockBackgroundHovered to true", () => {
      // Arrange
      const pointerOverCb = mockSprite.on.mock.calls.find(
        (call: any) => call[0] === "pointerover",
      )[1];

      // Act
      pointerOverCb();

      // Assert
      expect(inputManager.isStockBackgroundHovered).toBe(true);
      expect(mockBoardScene.updateHighlightBorder).toHaveBeenCalled();
    });

    it("pointerout sets isStockBackgroundHovered to false", () => {
      // Arrange
      inputManager.isStockBackgroundHovered = true;
      const pointerOutCb = mockSprite.on.mock.calls.find(
        (call: any) => call[0] === "pointerout",
      )[1];

      // Act
      pointerOutCb();

      // Assert
      expect(inputManager.isStockBackgroundHovered).toBe(false);
      expect(mockBoardScene.updateHighlightBorder).toHaveBeenCalled();
    });
  });

  describe("Drag State Transitions", () => {
    let cardVisual: PlayingCardVisual;
    let sprite: Phaser.GameObjects.Sprite;
    let mockSpriteFn: (x?: number, y?: number) => Phaser.GameObjects.Sprite;

    beforeEach(() => {
      const card = gameModel.tableaus[0].getCards()[0];
      cardVisual = new PlayingCardVisual(card);

      mockSpriteFn = (x = 0, y = 0) => {
        const dataMap = new Map<string, any>();
        return {
          x,
          y,
          setPosition: vi.fn().mockImplementation(function (
            this: any,
            nx: number,
            ny: number,
          ) {
            this.x = nx;
            this.y = ny;
            return this;
          }),
          setDepth: vi.fn(),
          getData: (key: string) => dataMap.get(key),
          setData: (key: string, val: any) => dataMap.set(key, val),
          displayWidth: 100,
          displayHeight: 150,
        } as unknown as Phaser.GameObjects.Sprite;
      };

      sprite = mockSpriteFn(100, 150);
      sprite.setData("cardVisual", cardVisual);
      cardVisual.sprite = sprite;

      mockBoardScene.tableauPiles[0].playingCardVisuals = [cardVisual];

      inputManager.registerDragListeners();
    });

    it("onDragStart initializes dragged stack and offsets", () => {
      // Act
      mockSceneListeners["dragstart"]({}, sprite);

      // Assert
      expect(inputManager.draggedStack).toEqual([cardVisual]);
      expect(inputManager.draggedStackOffsets).toEqual([{ x: 0, y: 0 }]);
      expect(sprite.setDepth).toHaveBeenCalledWith(1000);
      expect(mockBoardScene.updateHighlightBorder).toHaveBeenCalled();
    });

    it("onDragStart returns early if sprite lacks cardVisual data", () => {
      // Arrange
      const dummySprite = {
        getData: () => null,
      } as unknown as Phaser.GameObjects.Sprite;

      // Act
      mockSceneListeners["dragstart"]({}, dummySprite);

      // Assert
      expect(inputManager.draggedStack).toEqual([]);
    });

    it("onDragStart returns early if card is not in any model pile", () => {
      // Arrange
      const card = cardVisual.playingCard;
      gameModel.tableaus[0].removeCard(card);

      // Act
      mockSceneListeners["dragstart"]({}, sprite);

      // Assert
      expect(inputManager.draggedStack).toEqual([]);
    });

    it("onDragStart returns early if pile visual is not found", () => {
      // Arrange
      mockBoardScene.getPileVisualById.mockReturnValue(null);

      // Act
      mockSceneListeners["dragstart"]({}, sprite);

      // Assert
      expect(inputManager.draggedStack).toEqual([]);
    });

    it("onDragStart returns early if card visual is not in pile visual array", () => {
      // Arrange
      mockBoardScene.tableauPiles[0].playingCardVisuals = [];

      // Act
      mockSceneListeners["dragstart"]({}, sprite);

      // Assert
      expect(inputManager.draggedStack).toEqual([]);
    });

    it("onDrag updates position of dragged stack cards relative to primary card", () => {
      // Arrange
      // Add multiple cards to tableau
      const card2 = gameModel.tableaus[0].getCards()[0]; // Just a dummy
      const cardVisual2 = new PlayingCardVisual(card2);
      const sprite2 = mockSpriteFn(100, 180);
      cardVisual2.sprite = sprite2;
      mockBoardScene.tableauPiles[0].playingCardVisuals = [
        cardVisual,
        cardVisual2,
      ];

      mockSceneListeners["dragstart"]({}, sprite);

      // Act
      mockSceneListeners["drag"]({}, sprite, 200, 300);

      // Assert
      expect(sprite.setPosition).toHaveBeenCalledWith(200, 300);
      expect(sprite2.setPosition).toHaveBeenCalledWith(200, 330);
    });

    it("onDrag returns early if draggedStack is empty", () => {
      // Act
      mockSceneListeners["drag"]({}, sprite, 200, 300);

      // Assert
      expect(sprite.setPosition).not.toHaveBeenCalled();
    });

    it("onDragEnd returns early if draggedStack is empty", () => {
      // Act
      mockSceneListeners["dragend"]({}, sprite);

      // Assert
      expect(
        mockBoardScene.getLayoutManager().updateVisualLayout,
      ).not.toHaveBeenCalled();
    });

    it("onDragEnd returns early if visual data is missing", () => {
      // Arrange
      mockSceneListeners["dragstart"]({}, sprite);
      const dummySprite: any = { getData: () => null };

      // Act
      mockSceneListeners["dragend"]({}, dummySprite);

      // Assert
      expect(inputManager.draggedStack).toEqual([]);
      expect(
        mockBoardScene.getLayoutManager().updateVisualLayout,
      ).toHaveBeenCalled();
    });

    it("onDragEnd moves card if dropped on target and valid", () => {
      // Arrange
      // Let's set up the target pile visual to overlap
      const targetPile = mockBoardScene.tableauPiles[1];
      targetPile.position = { x: 150, y: 150 };
      targetPile.playingCardVisuals = []; // Empty

      // Position the sprite to overlap with target pile (x: 150, y: 150)
      sprite.x = 150;
      sprite.y = 150;
      sprite.displayWidth = 100;
      sprite.displayHeight = 150;

      mockSceneListeners["dragstart"]({}, sprite);

      const moveSpy = vi
        .spyOn(gameModel, "moveCardToPile")
        .mockReturnValue(true);

      // Act
      mockSceneListeners["dragend"]({}, sprite);

      // Assert
      expect(moveSpy).toHaveBeenCalledWith(
        cardVisual.playingCard.id,
        targetPile.value.id,
      );
      expect(inputManager.draggedStack).toEqual([]);
      moveSpy.mockRestore();
    });

    it("onDragEnd snaps card back to layout if move is invalid", () => {
      // Arrange
      const targetPile = mockBoardScene.tableauPiles[1];
      targetPile.position = { x: 150, y: 150 };
      targetPile.playingCardVisuals = [];

      sprite.x = 150;
      sprite.y = 150;

      mockSceneListeners["dragstart"]({}, sprite);

      const moveSpy = vi
        .spyOn(gameModel, "moveCardToPile")
        .mockReturnValue(false);

      // Act
      mockSceneListeners["dragend"]({}, sprite);

      // Assert
      expect(moveSpy).toHaveBeenCalled();
      expect(
        mockBoardScene.getLayoutManager().updateVisualLayout,
      ).toHaveBeenCalled();
      expect(inputManager.draggedStack).toEqual([]);
      moveSpy.mockRestore();
    });

    it("onDragEnd does not find a target pile if there is no overlap", () => {
      // Arrange
      sprite.x = 9000;
      sprite.y = 9000;

      mockSceneListeners["dragstart"]({}, sprite);
      const moveSpy = vi.spyOn(gameModel, "moveCardToPile");

      // Act
      mockSceneListeners["dragend"]({}, sprite);

      // Assert
      expect(moveSpy).not.toHaveBeenCalled();
      expect(
        mockBoardScene.getLayoutManager().updateVisualLayout,
      ).toHaveBeenCalled();
      expect(inputManager.draggedStack).toEqual([]);
      moveSpy.mockRestore();
    });
  });
});
