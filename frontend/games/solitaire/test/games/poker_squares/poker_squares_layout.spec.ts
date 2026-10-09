import { describe, it, expect } from "vitest";
import { computeScale } from "@/engine/render/layout/table_layout";
import {
  POKER_SQUARES_ARRANGED_LAYOUTS,
  POKER_SQUARES_LAYOUT,
} from "@/games/poker_squares/poker_squares_layout";
import {
  HAND_PILE_ID,
  STOCK_PILE_ID,
} from "@/games/poker_squares/poker_squares_zones";
import {
  DESKTOP,
  UPRIGHT,
  gridChooser,
  itLaysOutArrangedGrids,
  slotOf,
} from "@test/support/arranged_grids";

/** Returns the grid a viewport and arrangement call for. */
const gridFor = gridChooser({
  roomy: POKER_SQUARES_LAYOUT,
  arranged: POKER_SQUARES_ARRANGED_LAYOUTS,
});

describe("Poker Squares's arranged grids", () => {
  itLaysOutArrangedGrids({
    roomy: POKER_SQUARES_LAYOUT,
    arranged: POKER_SQUARES_ARRANGED_LAYOUTS,
    longestColumn: { faceDown: 0, faceUp: 1 },
  });

  it("is five cards wide upright, so its cards are bigger than the larger screen's grid would draw them", () => {
    const grid = gridFor(UPRIGHT);

    expect([
      grid.columns,
      computeScale(grid, UPRIGHT) > computeScale(POKER_SQUARES_LAYOUT, UPRIGHT),
    ]).toEqual([5, true]);
  });

  it("puts the stock and the card to place along the bottom right of an upright phone by default", () => {
    const grid = gridFor(UPRIGHT);

    expect(
      [STOCK_PILE_ID, HAND_PILE_ID].map((pileId) => slotOf(grid, pileId)),
    ).toEqual([
      { pileId: STOCK_PILE_ID, column: 4, row: 0, anchor: "bottom" },
      { pileId: HAND_PILE_ID, column: 3, row: 0, anchor: "bottom" },
    ]);
  });

  it("puts them in a row above the grid upright with the piles at the top", () => {
    const grid = gridFor(UPRIGHT, { piles: "top", stockSide: "left" });

    expect(
      [STOCK_PILE_ID, HAND_PILE_ID, "square-0-0"].map((pileId) => {
        const slot = slotOf(grid, pileId)!;
        return [slot.column, slot.row];
      }),
    ).toEqual([
      [0, 0],
      [1, 0],
      [0, 1],
    ]);
  });

  it("stands them beside the grid's last two rows on a larger screen with the piles at the bottom", () => {
    const grid = gridFor(DESKTOP, { piles: "bottom", stockSide: "left" });

    expect(
      [STOCK_PILE_ID, HAND_PILE_ID].map((pileId) => {
        const slot = slotOf(grid, pileId)!;
        return [slot.column, slot.row];
      }),
    ).toEqual([
      [0, 3],
      [0, 4],
    ]);
  });
});
