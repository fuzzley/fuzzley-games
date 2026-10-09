import { describe, it, expect } from "vitest";
import { TableLayoutSpec } from "@/engine/render/layout/table_layout";
import {
  EIGHT_OFF_ARRANGED_LAYOUTS,
  EIGHT_OFF_LAYOUT,
} from "@/games/eight_off/eight_off_layout";
import {
  DESKTOP,
  UPRIGHT,
  gridChooser,
  itLaysOutArrangedGrids,
  slotOf,
} from "@test/support/arranged_grids";

/** Returns the grid a viewport and arrangement call for. */
const gridFor = gridChooser({
  roomy: EIGHT_OFF_LAYOUT,
  arranged: EIGHT_OFF_ARRANGED_LAYOUTS,
});

const CELLS = Array.from({ length: 8 }, (_, index) => `cell-${index}`);

const FOUNDATIONS = [
  "foundation-0",
  "foundation-1",
  "foundation-2",
  "foundation-3",
];

const COLUMNS = Array.from({ length: 8 }, (_, index) => `tableau-${index}`);

/** Returns where a grid puts a pile: its column, row and edge. */
function placeOf(grid: TableLayoutSpec, pileId: string) {
  const slot = slotOf(grid, pileId)!;
  return [slot.column, slot.row, slot.anchor ?? "top"];
}

describe("Eight Off's arranged grids", () => {
  itLaysOutArrangedGrids({
    roomy: EIGHT_OFF_LAYOUT,
    arranged: EIGHT_OFF_ARRANGED_LAYOUTS,
    longestColumn: { faceDown: 0, faceUp: 14 },
  });

  it("is only as wide as the columns upright", () => {
    expect(gridFor(UPRIGHT).columns).toBe(8);
  });

  it("puts the columns side by side from the left edge upright", () => {
    const grid = gridFor(UPRIGHT);

    expect(COLUMNS.map((pileId) => slotOf(grid, pileId)!.column)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it("puts the cells on the bottom edge and the foundations above them upright by default", () => {
    expect(
      ["cell-0", "cell-7", "foundation-0", "foundation-3"].map((pileId) =>
        placeOf(gridFor(UPRIGHT), pileId),
      ),
    ).toEqual([
      [7, 0, "bottom"],
      [0, 0, "bottom"],
      [5, 1, "bottom"],
      [2, 1, "bottom"],
    ]);
  });

  it("puts the cells on the top edge, above the foundations, upright with the piles at the top", () => {
    const grid = gridFor(UPRIGHT, { piles: "top", stockSide: "left" });

    expect(
      ["cell-0", "foundation-0", "tableau-0"].map((pileId) =>
        placeOf(grid, pileId),
      ),
    ).toEqual([
      [0, 0, "top"],
      [2, 1, "top"],
      [0, 2, "top"],
    ]);
  });

  it("keeps the larger screen's single row with the piles below", () => {
    const grid = gridFor(DESKTOP, { piles: "bottom", stockSide: "left" });

    expect(
      ["cell-0", "foundation-3", "tableau-0"].map((pileId) =>
        placeOf(grid, pileId),
      ),
    ).toEqual([
      [0, 0, "bottom"],
      [11, 0, "bottom"],
      [2, 0, "top"],
    ]);
  });

  it.each([
    ["from the top", EIGHT_OFF_ARRANGED_LAYOUTS.landscape.top],
    ["on the bottom", EIGHT_OFF_ARRANGED_LAYOUTS.landscape.bottom],
  ])(
    "stacks the cells down one rail and the foundations the other on its side, %s",
    (_name, grid) => {
      const columnsOf = (piles: string[]) => [
        ...new Set(piles.map((pileId) => slotOf(grid, pileId)!.column)),
      ];

      expect([columnsOf(CELLS), columnsOf(FOUNDATIONS)]).toEqual([[0], [9]]);
    },
  );
});
