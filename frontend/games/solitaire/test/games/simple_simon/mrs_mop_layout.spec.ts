import { describe, it, expect } from "vitest";
import {
  MRS_MOP_ARRANGED_LAYOUTS,
  MRS_MOP_LAYOUT,
} from "@/games/simple_simon/simple_simon_layout";
import { itLaysOutArrangedGrids, slotOf } from "@test/support/arranged_grids";

/** The foundations, left to right. */
const FOUNDATIONS = Array.from(
  { length: 8 },
  (_, index) => `foundation-${index}`,
);

describe("Mrs. Mop's arranged grids", () => {
  itLaysOutArrangedGrids({
    roomy: MRS_MOP_LAYOUT,
    arranged: MRS_MOP_ARRANGED_LAYOUTS,
    longestColumn: { faceDown: 0, faceUp: 23 },
  });

  it("needs no more height for the piles below than above on a larger screen", () => {
    expect(MRS_MOP_ARRANGED_LAYOUTS.roomy.bottom.designHeightPx).toBe(
      MRS_MOP_LAYOUT.designHeightPx,
    );
  });

  it.each([
    ["from the top", MRS_MOP_ARRANGED_LAYOUTS.landscape.top],
    ["on the bottom", MRS_MOP_ARRANGED_LAYOUTS.landscape.bottom],
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
