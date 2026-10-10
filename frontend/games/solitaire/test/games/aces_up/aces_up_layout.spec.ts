import { describe, it, expect } from "vitest";
import { computeScale } from "@/engine/render/layout/table_metrics";
import {
  ACES_UP_ARRANGED_LAYOUTS,
  ACES_UP_LAYOUT,
} from "@/games/aces_up/aces_up_layout";
import { DISCARD_PILE_ID, STOCK_PILE_ID } from "@/games/aces_up/aces_up_zones";
import {
  DESKTOP,
  UPRIGHT,
  gridChooser,
  itLaysOutArrangedGrids,
  leastRoom,
  slotOf,
} from "@test/support/arranged_grids";

/** Returns the grid a viewport and arrangement call for. */
const gridFor = gridChooser({
  roomy: ACES_UP_LAYOUT,
  arranged: ACES_UP_ARRANGED_LAYOUTS,
});

describe("Aces Up's arranged grids", () => {
  itLaysOutArrangedGrids({
    roomy: ACES_UP_LAYOUT,
    arranged: ACES_UP_ARRANGED_LAYOUTS,
    longestColumn: { faceDown: 0, faceUp: 13 },
  });

  it("gives the columns the whole width upright, so its cards are bigger than the larger screen's grid would draw them", () => {
    const grid = gridFor(UPRIGHT);

    expect([
      grid.columns,
      computeScale(grid, UPRIGHT) > computeScale(ACES_UP_LAYOUT, UPRIGHT),
    ]).toEqual([4, true]);
  });

  it("puts the stock at the bottom right of an upright phone and the discard at the bottom left by default", () => {
    const grid = gridFor(UPRIGHT);

    expect(
      [STOCK_PILE_ID, DISCARD_PILE_ID].map((pileId) => slotOf(grid, pileId)),
    ).toEqual([
      { pileId: STOCK_PILE_ID, column: 3, row: 0, anchor: "bottom" },
      { pileId: DISCARD_PILE_ID, column: 0, row: 0, anchor: "bottom" },
    ]);
  });

  it("stands the stock and the discard on the bottom edge beside the columns of a larger screen with the piles at the bottom", () => {
    const grid = gridFor(DESKTOP, { piles: "bottom", stockSide: "left" });

    expect(
      [STOCK_PILE_ID, DISCARD_PILE_ID].map((pileId) => {
        const slot = slotOf(grid, pileId)!;
        return [slot.column, slot.anchor];
      }),
    ).toEqual([
      [0, "bottom"],
      [5, "bottom"],
    ]);
  });

  it("leaves the columns their full height beside the piles on the bottom edge", () => {
    const top = gridFor(DESKTOP);
    const bottom = gridFor(DESKTOP, { piles: "bottom", stockSide: "left" });

    expect(leastRoom(bottom, DESKTOP, ACES_UP_ARRANGED_LAYOUTS.columns)).toBe(
      leastRoom(top, DESKTOP, ACES_UP_ARRANGED_LAYOUTS.columns),
    );
  });
});
