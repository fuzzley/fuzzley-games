import { describe, it, expect } from "vitest";
import {
  CALCULATION_ARRANGED_LAYOUTS,
  CALCULATION_LAYOUT,
} from "@/games/calculation/calculation_layout";
import {
  HAND_PILE_ID,
  STOCK_PILE_ID,
} from "@/games/calculation/calculation_zones";
import {
  UPRIGHT,
  gridChooser,
  itLaysOutArrangedGrids,
  slotOf,
} from "@test/support/arranged_grids";

/** Returns the grid a viewport and arrangement call for. */
const gridFor = gridChooser({
  roomy: CALCULATION_LAYOUT,
  arranged: CALCULATION_ARRANGED_LAYOUTS,
});

/** Each waste pile with the foundation above it, left to right. */
const PAIRS = [0, 1, 2, 3].map((index) => [
  `foundation-${index}`,
  `waste-${index}`,
]);

describe("Calculation's arranged grids", () => {
  itLaysOutArrangedGrids({
    roomy: CALCULATION_LAYOUT,
    arranged: CALCULATION_ARRANGED_LAYOUTS,
    longestColumn: { faceDown: 0, faceUp: 13 },
  });

  it.each([
    ["the stock at the left", "left"],
    ["the stock at the right", "right"],
  ] as const)(
    "keeps each waste pile under a foundation upright, %s",
    (_name, side) => {
      const grid = gridFor(UPRIGHT, { piles: "auto", stockSide: side });

      const wasteColumns = PAIRS.map(
        ([, waste]) => slotOf(grid, waste)!.column,
      );
      const foundationColumns = PAIRS.map(
        ([foundation]) => slotOf(grid, foundation)!.column,
      );

      expect(wasteColumns.sort()).toEqual(foundationColumns.sort());
    },
  );

  it("puts the stock at the bottom right of an upright phone by default, beside the hand", () => {
    const grid = gridFor(UPRIGHT);

    expect(
      [STOCK_PILE_ID, HAND_PILE_ID].map((pileId) => slotOf(grid, pileId)),
    ).toEqual([
      { pileId: STOCK_PILE_ID, column: 5, row: 0, anchor: "bottom" },
      { pileId: HAND_PILE_ID, column: 4, row: 0, anchor: "bottom" },
    ]);
  });

  it.each([
    ["from the top", CALCULATION_ARRANGED_LAYOUTS.landscape.top],
    ["on the bottom", CALCULATION_ARRANGED_LAYOUTS.landscape.bottom],
  ])(
    "puts the foundations down one rail and the stock above the hand on the other on its side, %s",
    (_name, grid) => {
      const foundations = new Set(
        PAIRS.map(([foundation]) => slotOf(grid, foundation)!.column),
      );
      const [stock, hand] = [STOCK_PILE_ID, HAND_PILE_ID].map((pileId) =>
        slotOf(grid, pileId)!,
      );

      expect([
        [...foundations],
        stock.column,
        hand.column,
        stock.offset!.y < hand.offset!.y,
      ]).toEqual([[0], 5, 5, true]);
    },
  );
});
