import { describe, it, expect } from "vitest";
import { computeScale } from "@/engine/render/layout/table_layout";
import {
  MONTE_CARLO_ARRANGED_LAYOUTS,
  MONTE_CARLO_LAYOUT,
} from "@/games/monte_carlo/monte_carlo_layout";
import {
  DISCARD_PILE_ID,
  STOCK_PILE_ID,
} from "@/games/monte_carlo/monte_carlo_zones";
import {
  DESKTOP,
  UPRIGHT,
  gridChooser,
  itLaysOutArrangedGrids,
  slotOf,
} from "@test/support/arranged_grids";

/** Returns the grid a viewport and arrangement call for. */
const gridFor = gridChooser({
  roomy: MONTE_CARLO_LAYOUT,
  arranged: MONTE_CARLO_ARRANGED_LAYOUTS,
});

describe("Monte Carlo's arranged grids", () => {
  itLaysOutArrangedGrids({
    roomy: MONTE_CARLO_LAYOUT,
    arranged: MONTE_CARLO_ARRANGED_LAYOUTS,
    longestColumn: { faceDown: 0, faceUp: 1 },
  });

  it("is five cards wide upright, so its cards are bigger than the larger screen's grid would draw them", () => {
    const grid = gridFor(UPRIGHT);

    expect([
      grid.columns,
      computeScale(grid, UPRIGHT) > computeScale(MONTE_CARLO_LAYOUT, UPRIGHT),
    ]).toEqual([5, true]);
  });

  it("puts the stock at the bottom right of an upright phone and the discard at the bottom left by default", () => {
    const grid = gridFor(UPRIGHT);

    expect(
      [STOCK_PILE_ID, DISCARD_PILE_ID].map((pileId) => slotOf(grid, pileId)),
    ).toEqual([
      { pileId: STOCK_PILE_ID, column: 4, row: 0, anchor: "bottom" },
      { pileId: DISCARD_PILE_ID, column: 0, row: 0, anchor: "bottom" },
    ]);
  });

  it("stands the stock and the discard beside the grid's last row on a larger screen with the piles at the bottom", () => {
    const grid = gridFor(DESKTOP, { piles: "bottom", stockSide: "left" });

    expect(
      [STOCK_PILE_ID, DISCARD_PILE_ID].map((pileId) => {
        const slot = slotOf(grid, pileId)!;
        return [slot.column, slot.row];
      }),
    ).toEqual([
      [0, 4],
      [6, 4],
    ]);
  });
});
