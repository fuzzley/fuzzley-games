import { describe, it, expect } from "vitest";
import {
  FREECELL_ARRANGED_LAYOUTS,
  FREECELL_LAYOUT,
} from "@/games/freecell/freecell_layout";
import { ROOMY_FAN_FIT } from "@/games/common/pile_layouts";
import {
  DESKTOP,
  UPRIGHT,
  columnHeightAtFloors,
  gridChooser,
  itLaysOutArrangedGrids,
  leastRoom,
  slotOf,
} from "@test/support/arranged_grids";

/** Returns the grid a viewport and arrangement call for. */
const gridFor = gridChooser({
  roomy: FREECELL_LAYOUT,
  arranged: FREECELL_ARRANGED_LAYOUTS,
});

const CELLS = ["cell-0", "cell-1", "cell-2", "cell-3"];

const FOUNDATIONS = [
  "foundation-0",
  "foundation-1",
  "foundation-2",
  "foundation-3",
];

/** Thirteen cards: seven dealt, and a run built on them. */
const LONGEST = { faceDown: 0, faceUp: 13 };

describe("FreeCell's arranged grids", () => {
  itLaysOutArrangedGrids({
    roomy: FREECELL_LAYOUT,
    arranged: FREECELL_ARRANGED_LAYOUTS,
    longestColumn: LONGEST,
  });

  it("puts the free cells at the bottom right of an upright phone by default", () => {
    const grid = gridFor(UPRIGHT);

    expect(
      CELLS.map((pileId) => [
        slotOf(grid, pileId)!.column,
        slotOf(grid, pileId)!.anchor,
      ]),
    ).toEqual([
      [7, "bottom"],
      [6, "bottom"],
      [5, "bottom"],
      [4, "bottom"],
    ]);
  });

  it("puts the foundations at the bottom left of an upright phone by default", () => {
    const grid = gridFor(UPRIGHT);

    expect(
      FOUNDATIONS.map((pileId) => slotOf(grid, pileId)!.column).sort(),
    ).toEqual([0, 1, 2, 3]);
  });

  it("keeps thirteen cards clear of the piles along the bottom of a larger screen", () => {
    const grid = gridFor(DESKTOP, { piles: "bottom", stockSide: "auto" });

    expect(
      leastRoom(grid, DESKTOP, FREECELL_ARRANGED_LAYOUTS.columns),
    ).toBeGreaterThanOrEqual(columnHeightAtFloors(LONGEST, ROOMY_FAN_FIT));
  });

  describe("on its side", () => {
    const { top, bottom } = FREECELL_ARRANGED_LAYOUTS.landscape;

    it.each([
      ["from the top", top],
      ["on the bottom", bottom],
    ])(
      "stacks the cells down one rail and the foundations the other, %s",
      (_name, grid) => {
        const columnsOf = (piles: string[]) => [
          ...new Set(piles.map((pileId) => slotOf(grid, pileId)!.column)),
        ];

        expect([columnsOf(CELLS), columnsOf(FOUNDATIONS)]).toEqual([[0], [9]]);
      },
    );

    it("shows more than half of each cell's card down the rail", () => {
      const tops = CELLS.map((pileId) => slotOf(top, pileId)!.offset!.y);
      const steps = tops.slice(1).map((y, index) => y - tops[index]);

      expect(Math.min(...steps)).toBeGreaterThan(top.cardSize.height / 2);
    });
  });
});
