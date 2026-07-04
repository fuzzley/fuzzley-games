import { vi } from "vitest";
import { BoardLayoutManager } from "../../../../../src/render/scene/board/layout/board_layout_manager";
import { Visual } from "../../../../../src/render/visual/visual";
import { CardPile } from "../../../../../src/model/card/card_pile";

function createMockSprite() {
  const sprite = {
    x: 0,
    y: 0,
    scale: 1,
    originX: 0,
    originY: 0,
    depth: 0,
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
    setOrigin: vi.fn().mockImplementation(function (
      this: any,
      x: number,
      y: number,
    ) {
      this.originX = x;
      this.originY = y;
      return this;
    }),
    setDepth: vi.fn().mockImplementation(function (this: any, depth: number) {
      this.depth = depth;
      return this;
    }),
  };
  return sprite;
}

describe("BoardLayoutManager", () => {
  it("maps positions for each pile on the board correctly", () => {
    // Mock the BoardScene with piles that have Visual wrappers
    const mockBoardScene = {
      stockPile: new Visual(new CardPile()),
      wastePile: new Visual(new CardPile()),
      foundationPiles: [
        new Visual(new CardPile()),
        new Visual(new CardPile()),
        new Visual(new CardPile()),
        new Visual(new CardPile()),
      ],
      tableauPiles: [
        new Visual(new CardPile()),
        new Visual(new CardPile()),
        new Visual(new CardPile()),
        new Visual(new CardPile()),
        new Visual(new CardPile()),
        new Visual(new CardPile()),
        new Visual(new CardPile()),
      ],
    };

    const layoutManager = new BoardLayoutManager(mockBoardScene as any);
    layoutManager.createInitialLayout();

    // Verify Stock Pile position (Column 0, Top Row)
    // paddingX (40) + 0 * (221 + 30) = 40
    // topRowY = 40
    expect(mockBoardScene.stockPile.position).toEqual({ x: 40, y: 40 });

    // Verify Waste Pile position (Column 1, Top Row)
    // paddingX (40) + 1 * (221 + 30) = 291
    expect(mockBoardScene.wastePile.position).toEqual({ x: 291, y: 40 });

    // Verify Foundation Piles positions (Columns 3 to 6, Top Row)
    // Col 3: 40 + 3 * 251 = 793
    // Col 4: 40 + 4 * 251 = 1044
    // Col 5: 40 + 5 * 251 = 1295
    // Col 6: 40 + 6 * 251 = 1546
    expect(mockBoardScene.foundationPiles[0].position).toEqual({
      x: 793,
      y: 40,
    });
    expect(mockBoardScene.foundationPiles[1].position).toEqual({
      x: 1044,
      y: 40,
    });
    expect(mockBoardScene.foundationPiles[2].position).toEqual({
      x: 1295,
      y: 40,
    });
    expect(mockBoardScene.foundationPiles[3].position).toEqual({
      x: 1546,
      y: 40,
    });

    // Verify Tableau Piles positions (Columns 0 to 6, Bottom Row)
    // bottomRowY = paddingY (40) + cardHeight (313) + gapY (40) = 393
    expect(mockBoardScene.tableauPiles[0].position).toEqual({ x: 40, y: 393 });
    expect(mockBoardScene.tableauPiles[1].position).toEqual({ x: 291, y: 393 });
    expect(mockBoardScene.tableauPiles[2].position).toEqual({ x: 542, y: 393 });
    expect(mockBoardScene.tableauPiles[3].position).toEqual({ x: 793, y: 393 });
    expect(mockBoardScene.tableauPiles[4].position).toEqual({
      x: 1044,
      y: 393,
    });
    expect(mockBoardScene.tableauPiles[5].position).toEqual({
      x: 1295,
      y: 393,
    });
    expect(mockBoardScene.tableauPiles[6].position).toEqual({
      x: 1546,
      y: 393,
    });
  });

  it("updates visual layout and aligns sprites correctly", () => {
    const mockStockPile = {
      layoutPile: vi.fn(),
      position: { x: 10, y: 20 },
      playingCardVisuals: [
        {
          position: { x: 5, y: 5 },
          sprite: createMockSprite(),
        },
        {
          position: { x: 6, y: 6 },
        },
      ],
    };
    const mockWastePile = {
      layoutPile: vi.fn(),
      position: { x: 30, y: 40 },
      playingCardVisuals: [],
    };
    const mockFoundationPile = {
      layoutPile: vi.fn(),
      position: { x: 50, y: 60 },
      playingCardVisuals: [
        {
          position: { x: 2, y: 2 },
          sprite: createMockSprite(),
        },
      ],
    };
    const mockTableauPile = {
      layoutPile: vi.fn(),
      position: { x: 70, y: 80 },
      playingCardVisuals: [
        {
          position: { x: 3, y: 3 },
          sprite: createMockSprite(),
        },
      ],
    };

    const mockBoardScene = {
      stockPile: mockStockPile,
      wastePile: mockWastePile,
      foundationPiles: [mockFoundationPile],
      tableauPiles: [mockTableauPile],
    };

    const layoutManager = new BoardLayoutManager(mockBoardScene as any);
    layoutManager.updateVisualLayout();

    const stockSprite = mockStockPile.playingCardVisuals[0].sprite!;
    expect(stockSprite.x).toBe(15);
    expect(stockSprite.y).toBe(25);
    expect(stockSprite.depth).toBe(0);

    const foundationSprite = mockFoundationPile.playingCardVisuals[0].sprite!;
    expect(foundationSprite.x).toBe(52);
    expect(foundationSprite.y).toBe(62);
    expect(foundationSprite.depth).toBe(0);

    const tableauSprite = mockTableauPile.playingCardVisuals[0].sprite!;
    expect(tableauSprite.x).toBe(73);
    expect(tableauSprite.y).toBe(83);
    expect(tableauSprite.depth).toBe(0);
  });

  it("scales cards and aligns coordinates correctly when viewport is smaller than default", () => {
    const mockStockSprite = createMockSprite();
    const mockBoardScene = {
      scale: {
        width: 903.5,
        height: 475,
      },
      stockPile: {
        layoutPile: vi.fn(),
        position: { x: 0, y: 0 },
        playingCardVisuals: [
          {
            position: { x: 10, y: 20 },
            sprite: mockStockSprite,
          },
        ],
      },
      wastePile: {
        layoutPile: vi.fn(),
        position: { x: 0, y: 0 },
        playingCardVisuals: [],
      },
      foundationPiles: [],
      tableauPiles: [],
    };

    const layoutManager = new BoardLayoutManager(mockBoardScene as any);
    layoutManager.createInitialLayout();
    layoutManager.updateVisualLayout();

    expect(mockBoardScene.stockPile.position).toEqual({ x: 20, y: 20 });
    expect(mockStockSprite.x).toBe(25);
    expect(mockStockSprite.y).toBe(30);
    expect(mockStockSprite.scale).toBe(0.5);
    expect(mockStockSprite.depth).toBe(0);
  });

  it("defaults scale factor to 1.0 when viewport scale object is missing", () => {
    const mockBoardScene = {
      stockPile: { position: { x: 0, y: 0 } },
      wastePile: { position: { x: 0, y: 0 } },
      foundationPiles: [],
      tableauPiles: [],
    };
    const layoutManager = new BoardLayoutManager(mockBoardScene as any);

    const scaleFactor = layoutManager.getScaleFactor();

    expect(scaleFactor).toBe(1.0);
  });

  it("caps scale factor to 1.0 when viewport is larger than default", () => {
    const mockBoardScene = {
      scale: {
        width: 3000,
        height: 2000,
      },
    };
    const layoutManager = new BoardLayoutManager(mockBoardScene as any);

    const scaleFactor = layoutManager.getScaleFactor();

    expect(scaleFactor).toBe(1.0);
  });

  it("defaults scale factor to 1.0 when scale factor is <= 0", () => {
    const mockBoardScene = {
      scale: {
        width: -10,
        height: -20,
      },
    };
    const layoutManager = new BoardLayoutManager(mockBoardScene as any);

    const scaleFactor = layoutManager.getScaleFactor();

    expect(scaleFactor).toBe(1.0);
  });
});
