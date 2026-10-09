import { describe, it, expect } from "vitest";
import {
  SIMPLE_SIMON_ARRANGED_LAYOUTS,
  SIMPLE_SIMON_LAYOUT,
} from "@/games/simple_simon/simple_simon_layout";
import { itLaysOutArrangedGrids, slotOf } from "@test/support/arranged_grids";

const FOUNDATIONS = [
  "foundation-0",
  "foundation-1",
  "foundation-2",
  "foundation-3",
];

describe("Simple Simon's arranged grids", () => {
  itLaysOutArrangedGrids({
    roomy: SIMPLE_SIMON_LAYOUT,
    arranged: SIMPLE_SIMON_ARRANGED_LAYOUTS,
    longestColumn: { faceDown: 0, faceUp: 15 },
  });

  it("needs no more height for the piles below than above on a larger screen", () => {
    expect(SIMPLE_SIMON_ARRANGED_LAYOUTS.roomy.bottom.designHeightPx).toBe(
      SIMPLE_SIMON_LAYOUT.designHeightPx,
    );
  });

  it.each([
    ["from the top", SIMPLE_SIMON_ARRANGED_LAYOUTS.landscape.top],
    ["on the bottom", SIMPLE_SIMON_ARRANGED_LAYOUTS.landscape.bottom],
  ])(
    "stacks the foundations down the right rail on its side, %s",
    (_name, grid) => {
      const columns = new Set(
        FOUNDATIONS.map((pileId) => slotOf(grid, pileId)!.column),
      );

      expect([...columns]).toEqual([10]);
    },
  );
});
