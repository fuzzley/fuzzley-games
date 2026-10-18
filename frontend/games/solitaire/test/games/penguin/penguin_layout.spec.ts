import { describe, it, expect } from "vitest";
import {
  PENGUIN_ARRANGED_LAYOUTS,
  PENGUIN_LAYOUT,
} from "@/games/penguin/penguin_layout";
import {
  UPRIGHT,
  gridChooser,
  itLaysOutArrangedGrids,
  slotOf,
} from "@test/support/arranged_grids";

/** Returns the grid a viewport and arrangement call for. */
const gridFor = gridChooser({
  roomy: PENGUIN_LAYOUT,
  arranged: PENGUIN_ARRANGED_LAYOUTS,
});

const CELLS = Array.from({ length: 7 }, (_, index) => `cell-${index}`);

const FOUNDATIONS = [
  "foundation-0",
  "foundation-1",
  "foundation-2",
  "foundation-3",
];

describe("Penguin's arranged grids", () => {
  itLaysOutArrangedGrids({
    roomy: PENGUIN_LAYOUT,
    arranged: PENGUIN_ARRANGED_LAYOUTS,
    longestColumn: { faceDown: 0, faceUp: 13 },
  });

  it("is only as wide as the columns upright", () => {
    expect(gridFor(UPRIGHT).columns).toBe(7);
  });

  it("centres the foundations next to the columns, and the cells on the bottom edge, upright by default", () => {
    const grid = gridFor(UPRIGHT);

    expect(
      [...FOUNDATIONS, "cell-0"].map((pileId) => {
        const slot = slotOf(grid, pileId)!;
        return [slot.column, slot.row];
      }),
    ).toEqual([
      [4.5, 1],
      [3.5, 1],
      [2.5, 1],
      [1.5, 1],
      [6, 0],
    ]);
  });

  it.each([
    ["from the top", PENGUIN_ARRANGED_LAYOUTS.landscape.top],
    ["on the bottom", PENGUIN_ARRANGED_LAYOUTS.landscape.bottom],
  ])(
    "stacks the cells down one rail and the foundations the other on its side, %s",
    (_name, grid) => {
      const columnsOf = (piles: string[]) => [
        ...new Set(piles.map((pileId) => slotOf(grid, pileId)!.column)),
      ];

      expect([columnsOf(CELLS), columnsOf(FOUNDATIONS)]).toEqual([[0], [8]]);
    },
  );
});
