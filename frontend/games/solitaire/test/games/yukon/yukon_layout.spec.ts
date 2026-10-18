import { describe, it, expect } from "vitest";
import {
  YUKON_ARRANGED_LAYOUTS,
  YUKON_LAYOUT,
} from "@/games/yukon/yukon_layout";
import {
  UPRIGHT,
  gridChooser,
  itLaysOutArrangedGrids,
  slotOf,
} from "@test/support/arranged_grids";

/** Returns the grid a viewport and arrangement call for. */
const gridFor = gridChooser({
  roomy: YUKON_LAYOUT,
  arranged: YUKON_ARRANGED_LAYOUTS,
});

const FOUNDATIONS = [
  "foundation-0",
  "foundation-1",
  "foundation-2",
  "foundation-3",
];

describe("Yukon's arranged grids", () => {
  itLaysOutArrangedGrids({
    roomy: YUKON_LAYOUT,
    arranged: YUKON_ARRANGED_LAYOUTS,
    longestColumn: { faceDown: 6, faceUp: 13 },
  });

  it("has no side pile", () => {
    expect(YUKON_ARRANGED_LAYOUTS.side).toBeUndefined();
  });

  it("keeps the foundations at the bottom right of an upright phone, whatever side was chosen", () => {
    const grid = gridFor(UPRIGHT, { piles: "auto", stockSide: "left" });

    expect(FOUNDATIONS.map((pileId) => slotOf(grid, pileId))).toEqual(
      [3, 4, 5, 6].map((column, index) => ({
        pileId: FOUNDATIONS[index],
        column,
        row: 0,
        anchor: "bottom",
      })),
    );
  });

  it.each([
    ["from the top", YUKON_ARRANGED_LAYOUTS.landscape.top],
    ["on the bottom", YUKON_ARRANGED_LAYOUTS.landscape.bottom],
  ])(
    "stacks the foundations down the right rail on its side, %s",
    (_name, grid) => {
      const columns = new Set(
        FOUNDATIONS.map((pileId) => slotOf(grid, pileId)!.column),
      );

      expect([...columns]).toEqual([7]);
    },
  );
});
