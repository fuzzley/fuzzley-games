import { describe, it, expect } from "vitest";
import {
  BAKERS_DOZEN_ARRANGED_LAYOUTS,
  BAKERS_DOZEN_LAYOUT,
} from "@/games/bakers_dozen/bakers_dozen_layout";
import { itLaysOutArrangedGrids, slotOf } from "@test/support/arranged_grids";

/** The foundations, left to right. */
const FOUNDATIONS = Array.from(
  { length: 4 },
  (_, index) => `foundation-${index}`,
);

describe("Baker's Dozen's arranged grids", () => {
  itLaysOutArrangedGrids({
    roomy: BAKERS_DOZEN_LAYOUT,
    arranged: BAKERS_DOZEN_ARRANGED_LAYOUTS,
    longestColumn: { faceDown: 0, faceUp: 12 },
  });

  it("needs no more height for the piles below than above on a larger screen", () => {
    expect(BAKERS_DOZEN_ARRANGED_LAYOUTS.roomy.bottom.designHeightPx).toBe(
      BAKERS_DOZEN_LAYOUT.designHeightPx,
    );
  });

  it.each([
    ["from the top", BAKERS_DOZEN_ARRANGED_LAYOUTS.landscape.top],
    ["on the bottom", BAKERS_DOZEN_ARRANGED_LAYOUTS.landscape.bottom],
  ])(
    "stacks the foundations down the right rail on its side, %s",
    (_name, grid) => {
      const columns = new Set(
        FOUNDATIONS.map((pileId) => slotOf(grid, pileId)!.column),
      );

      expect([...columns]).toEqual([13]);
    },
  );
});
