import { BoardLayoutManager } from "../../../src/scene/board/board_layout_manager";
import { Visual } from "../../../src/visual/visual";
import { CardPile } from "../../../src/card/card_pile";

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
});
