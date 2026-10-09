import { describe, it, expect } from "vitest";
import { TABLEAU_HOVER_EXPANSION_OFFSET } from "@/games/common/pile_layouts";
import { GOLF_ARRANGED_LAYOUTS, GOLF_LAYOUT } from "@/games/golf/golf_layout";
import { FOUNDATION_PILE_ID, STOCK_PILE_ID } from "@/games/golf/golf_zones";
import {
  UPRIGHT,
  columnHeightAtFloors,
  gridChooser,
  itLaysOutArrangedGrids,
  slotOf,
} from "@test/support/arranged_grids";

/** Returns the grid a viewport and arrangement call for. */
const gridFor = gridChooser({
  roomy: GOLF_LAYOUT,
  arranged: GOLF_ARRANGED_LAYOUTS,
});

/** The five cards a column is dealt, the most it ever holds. */
const DEALT = { faceDown: 0, faceUp: 5 };

describe("Golf's arranged grids", () => {
  itLaysOutArrangedGrids({
    roomy: GOLF_LAYOUT,
    arranged: GOLF_ARRANGED_LAYOUTS,
    longestColumn: DEALT,
  });

  it("puts the stock at the bottom right of an upright phone by default", () => {
    expect(slotOf(gridFor(UPRIGHT), STOCK_PILE_ID)).toEqual({
      pileId: STOCK_PILE_ID,
      column: 6,
      row: 0,
      anchor: "bottom",
    });
  });

  it("puts the foundation beside the stock, towards the columns, upright", () => {
    expect(slotOf(gridFor(UPRIGHT), FOUNDATION_PILE_ID)!.column).toBe(5);
  });

  it("keeps the larger screen's grid with the piles below as tall as the one above", () => {
    expect(GOLF_ARRANGED_LAYOUTS.roomy.bottom.designHeightPx).toBe(
      GOLF_LAYOUT.designHeightPx,
    );
  });

  describe("on its side", () => {
    const { top, bottom } = GOLF_ARRANGED_LAYOUTS.landscape;

    it.each([
      ["from the top", top],
      ["on the bottom", bottom],
    ])(
      "puts the stock above the foundation on the right rail, %s",
      (_name, grid) => {
        const [stock, foundation] = [STOCK_PILE_ID, FOUNDATION_PILE_ID].map(
          (pileId) => slotOf(grid, pileId)!,
        );

        expect([
          stock.column,
          foundation.column,
          stock.offset!.y < foundation.offset!.y,
        ]).toEqual([7, 7, true]);
      },
    );

    it("is no taller than the columns need", () => {
      expect(top.designHeightPx! - 2 * top.padding.y).toBe(
        columnHeightAtFloors(DEALT) + TABLEAU_HOVER_EXPANSION_OFFSET,
      );
    });
  });
});
