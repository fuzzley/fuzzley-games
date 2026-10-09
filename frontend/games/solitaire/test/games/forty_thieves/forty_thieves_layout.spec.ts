import { describe, it, expect } from "vitest";
import { ArrangedLayouts } from "@/engine/render/layout/board_layouts";
import { TableLayoutSpec } from "@/engine/render/layout/table_layout";
import { ROOMY_FAN_FIT } from "@/games/common/pile_layouts";
import {
  FORTY_THIEVES_ARRANGED_LAYOUTS,
  FORTY_THIEVES_LAYOUT,
  LIMITED_ARRANGED_LAYOUTS,
  LIMITED_LAYOUT,
  LUCAS_ARRANGED_LAYOUTS,
  LUCAS_LAYOUT,
  MARIA_ARRANGED_LAYOUTS,
  MARIA_LAYOUT,
} from "@/games/forty_thieves/forty_thieves_layout";
import {
  STOCK_PILE_ID,
  WASTE_PILE_ID,
} from "@/games/forty_thieves/forty_thieves_zones";
import {
  DESKTOP,
  UPRIGHT,
  columnHeightAtFloors,
  gridChooser,
  itLaysOutArrangedGrids,
  leastRoom,
  slotOf,
} from "@test/support/arranged_grids";

/** The eight foundations, left to right. */
const FOUNDATIONS = Array.from(
  { length: 8 },
  (_, index) => `foundation-${index}`,
);

/** Every board in the family, named for the failure message. */
const BOARDS: [
  name: string,
  roomy: TableLayoutSpec,
  arranged: ArrangedLayouts,
][] = [
  ["Forty Thieves", FORTY_THIEVES_LAYOUT, FORTY_THIEVES_ARRANGED_LAYOUTS],
  ["Maria", MARIA_LAYOUT, MARIA_ARRANGED_LAYOUTS],
  ["Limited", LIMITED_LAYOUT, LIMITED_ARRANGED_LAYOUTS],
  ["Lucas", LUCAS_LAYOUT, LUCAS_ARRANGED_LAYOUTS],
];

describe.each(BOARDS)("%s's arranged grids", (_name, roomy, arranged) => {
  const gridFor = gridChooser({ roomy, arranged });
  const lastColumn = arranged.columns.at(-1)!;

  itLaysOutArrangedGrids({
    roomy,
    arranged,
    longestColumn: { faceDown: 0, faceUp: 14 },
  });

  it("puts the stock at the bottom right of an upright phone by default", () => {
    expect(slotOf(gridFor(UPRIGHT), STOCK_PILE_ID)).toEqual({
      pileId: STOCK_PILE_ID,
      column: roomy.columns - 1,
      row: 0,
      anchor: "bottom",
    });
  });

  it("keeps fourteen face-up cards clear of the piles along the bottom of a larger screen", () => {
    const grid = gridFor(DESKTOP, { piles: "bottom", stockSide: "auto" });

    expect(leastRoom(grid, DESKTOP, arranged.columns)).toBeGreaterThanOrEqual(
      columnHeightAtFloors({ faceDown: 0, faceUp: 14 }, ROOMY_FAN_FIT),
    );
  });

  it("needs no more height for the piles below than above on a larger screen", () => {
    expect(arranged.roomy.bottom.designHeightPx).toBe(roomy.designHeightPx);
  });

  describe("on its side", () => {
    const { top, bottom } = arranged.landscape;

    it.each([
      ["from the top", top],
      ["on the bottom", bottom],
    ])("stacks the foundations down the left rail, %s", (_rail, grid) => {
      const columns = new Set(
        FOUNDATIONS.map((pileId) => slotOf(grid, pileId)!.column),
      );

      expect([...columns]).toEqual([0]);
    });

    it.each([
      ["from the top", top],
      ["on the bottom", bottom],
    ])(
      "stands the stock above the waste on the right rail, %s",
      (_rail, grid) => {
        const [stock, waste] = [STOCK_PILE_ID, WASTE_PILE_ID].map((pileId) =>
          slotOf(grid, pileId)!,
        );

        expect([
          stock.column,
          waste.column,
          stock.offset!.y < waste.offset!.y,
        ]).toEqual([grid.columns - 1, grid.columns - 1, true]);
      },
    );

    it("puts the columns between the rails", () => {
      expect(slotOf(top, lastColumn)!.column).toBe(top.columns - 2);
    });
  });
});
