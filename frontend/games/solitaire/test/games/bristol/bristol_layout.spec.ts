import { describe, it, expect } from "vitest";
import { ROOMY_FAN_FIT } from "@/games/common/pile_layouts";
import {
  BRISTOL_ARRANGED_LAYOUTS,
  BRISTOL_LAYOUT,
} from "@/games/bristol/bristol_layout";
import { STOCK_PILE_ID } from "@/games/bristol/bristol_zones";
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
  roomy: BRISTOL_LAYOUT,
  arranged: BRISTOL_ARRANGED_LAYOUTS,
});

const RESERVES = ["reserve-0", "reserve-1", "reserve-2"];

const FOUNDATIONS = [
  "foundation-0",
  "foundation-1",
  "foundation-2",
  "foundation-3",
];

describe("Bristol's arranged grids", () => {
  itLaysOutArrangedGrids({
    roomy: BRISTOL_LAYOUT,
    arranged: BRISTOL_ARRANGED_LAYOUTS,
    longestColumn: { faceDown: 0, faceUp: 13 },
  });

  it("puts the stock at the bottom right of an upright phone by default", () => {
    expect(slotOf(gridFor(UPRIGHT), STOCK_PILE_ID)).toEqual({
      pileId: STOCK_PILE_ID,
      column: 7,
      row: 0,
      anchor: "bottom",
    });
  });

  it("puts the reserves between the stock and the foundations upright", () => {
    const grid = gridFor(UPRIGHT);

    expect(
      [STOCK_PILE_ID, ...RESERVES, "foundation-3"].map(
        (pileId) => slotOf(grid, pileId)!.column,
      ),
    ).toEqual([7, 6, 5, 4, 0]);
  });

  it("keeps thirteen fanned cards clear of the piles along the bottom of a larger screen", () => {
    const grid = gridFor(DESKTOP, { piles: "bottom", stockSide: "auto" });

    expect(
      leastRoom(grid, DESKTOP, BRISTOL_ARRANGED_LAYOUTS.columns),
    ).toBeGreaterThanOrEqual(
      columnHeightAtFloors({ faceDown: 0, faceUp: 13 }, ROOMY_FAN_FIT),
    );
  });

  describe("on its side", () => {
    const { top, bottom } = BRISTOL_ARRANGED_LAYOUTS.landscape;

    it.each([
      ["from the top", top],
      ["on the bottom", bottom],
    ])("stacks the foundations down the left rail, %s", (_name, grid) => {
      const columns = new Set(
        FOUNDATIONS.map((pileId) => slotOf(grid, pileId)!.column),
      );

      expect([...columns]).toEqual([0]);
    });

    it.each([
      ["from the top", top],
      ["on the bottom", bottom],
    ])(
      "stacks the stock and then the reserves down the right rail, %s",
      (_name, grid) => {
        const slots = [STOCK_PILE_ID, ...RESERVES].map((pileId) =>
          slotOf(grid, pileId)!,
        );
        const tops = slots.map((slot) => slot.offset!.y);

        expect([
          new Set(slots.map((slot) => slot.column)).size,
          slots[0].column,
          tops,
        ]).toEqual([1, 9, [...tops].sort((a, b) => a - b)]);
      },
    );
  });
});
