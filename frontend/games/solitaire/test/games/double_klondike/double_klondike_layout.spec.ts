import { describe, it, expect } from "vitest";
import {
  DOUBLE_KLONDIKE_ARRANGED_LAYOUTS,
  DOUBLE_KLONDIKE_LAYOUT,
} from "@/games/double_klondike/double_klondike_layout";
import {
  STOCK_PILE_ID,
  WASTE_PILE_ID,
} from "@/games/double_klondike/double_klondike_zones";
import {
  UPRIGHT,
  gridChooser,
  itLaysOutArrangedGrids,
  slotOf,
} from "@test/support/arranged_grids";

/** Returns the grid a viewport and arrangement call for. */
const gridFor = gridChooser({
  roomy: DOUBLE_KLONDIKE_LAYOUT,
  arranged: DOUBLE_KLONDIKE_ARRANGED_LAYOUTS,
});

/** The nine columns, left to right. */
const COLUMNS = Array.from({ length: 9 }, (_, index) => `tableau-${index}`);

describe("Double Klondike's arranged grids", () => {
  itLaysOutArrangedGrids({
    roomy: DOUBLE_KLONDIKE_LAYOUT,
    arranged: DOUBLE_KLONDIKE_ARRANGED_LAYOUTS,
    longestColumn: { faceDown: 8, faceUp: 12 },
  });

  it.each([
    ["the stock at the left", "left"],
    ["the stock at the right", "right"],
  ] as const)(
    "keeps the columns centred under the row upright, %s",
    (_name, side) => {
      const grid = gridFor(UPRIGHT, { piles: "auto", stockSide: side });

      expect(COLUMNS.map((pileId) => slotOf(grid, pileId)!.column)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9,
      ]);
    },
  );

  it("puts the stock at the bottom right of an upright phone by default", () => {
    expect(slotOf(gridFor(UPRIGHT), STOCK_PILE_ID)).toEqual({
      pileId: STOCK_PILE_ID,
      column: 10,
      row: 0,
      anchor: "bottom",
    });
  });

  describe("on its side", () => {
    const { top, bottom } = DOUBLE_KLONDIKE_ARRANGED_LAYOUTS.landscape;

    it("puts the columns side by side between the rails", () => {
      expect(COLUMNS.map((pileId) => slotOf(top, pileId)!.column)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9,
      ]);
    });

    it.each([
      ["from the top", top],
      ["on the bottom", bottom],
    ])(
      "stands the stock above the waste on the right rail, %s",
      (_name, grid) => {
        const [stock, waste] = [STOCK_PILE_ID, WASTE_PILE_ID].map((pileId) =>
          slotOf(grid, pileId)!,
        );

        expect([
          stock.column,
          waste.column,
          stock.offset!.y < waste.offset!.y,
        ]).toEqual([10, 10, true]);
      },
    );
  });
});
