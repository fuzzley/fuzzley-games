import { describe, it, expect } from "vitest";
import {
  SEAHAVEN_ARRANGED_LAYOUTS,
  SEAHAVEN_LAYOUT,
} from "@/games/seahaven/seahaven_layout";
import {
  UPRIGHT,
  gridChooser,
  itLaysOutArrangedGrids,
  slotOf,
} from "@test/support/arranged_grids";

/** Returns the grid a viewport and arrangement call for. */
const gridFor = gridChooser({
  roomy: SEAHAVEN_LAYOUT,
  arranged: SEAHAVEN_ARRANGED_LAYOUTS,
});

const CELLS = ["cell-0", "cell-1", "cell-2", "cell-3"];

const FOUNDATIONS = [
  "foundation-0",
  "foundation-1",
  "foundation-2",
  "foundation-3",
];

describe("Seahaven Towers's arranged grids", () => {
  itLaysOutArrangedGrids({
    roomy: SEAHAVEN_LAYOUT,
    arranged: SEAHAVEN_ARRANGED_LAYOUTS,
    longestColumn: { faceDown: 0, faceUp: 14 },
  });

  it("puts the cells at the bottom right of an upright phone by default", () => {
    const grid = gridFor(UPRIGHT);

    expect(CELLS.map((pileId) => slotOf(grid, pileId)!.column)).toEqual([
      9, 8, 7, 6,
    ]);
  });

  it("needs no more height for the piles below than above on a larger screen", () => {
    expect(SEAHAVEN_ARRANGED_LAYOUTS.roomy.bottom.designHeightPx).toBe(
      SEAHAVEN_LAYOUT.designHeightPx,
    );
  });

  it.each([
    ["from the top", SEAHAVEN_ARRANGED_LAYOUTS.landscape.top],
    ["on the bottom", SEAHAVEN_ARRANGED_LAYOUTS.landscape.bottom],
  ])(
    "stacks the cells down one rail and the foundations the other on its side, %s",
    (_name, grid) => {
      const columnsOf = (piles: string[]) => [
        ...new Set(piles.map((pileId) => slotOf(grid, pileId)!.column)),
      ];

      expect([columnsOf(CELLS), columnsOf(FOUNDATIONS)]).toEqual([[0], [11]]);
    },
  );
});
