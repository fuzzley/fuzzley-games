import { describe, it, expect } from "vitest";
import {
  FLOWER_GARDEN_ARRANGED_LAYOUTS,
  FLOWER_GARDEN_LAYOUT,
} from "@/games/flower_garden/flower_garden_layout";
import { RAIL_MIN_STEP } from "@/games/common/arranged_layouts";
import {
  UPRIGHT,
  gridChooser,
  itLaysOutArrangedGrids,
  slotOf,
} from "@test/support/arranged_grids";

/** Returns the grid a viewport and arrangement call for. */
const gridFor = gridChooser({
  roomy: FLOWER_GARDEN_LAYOUT,
  arranged: FLOWER_GARDEN_ARRANGED_LAYOUTS,
});

const BOUQUET = Array.from({ length: 16 }, (_, index) => `bouquet-${index}`);

const FOUNDATIONS = [
  "foundation-0",
  "foundation-1",
  "foundation-2",
  "foundation-3",
];

/** A fifteen-card bed. */
const LONGEST = { faceDown: 0, faceUp: 15 };

describe("Flower Garden's arranged grids", () => {
  itLaysOutArrangedGrids({
    roomy: FLOWER_GARDEN_LAYOUT,
    arranged: FLOWER_GARDEN_ARRANGED_LAYOUTS,
    longestColumn: LONGEST,
  });

  it("has no side pile, so the bouquet always fans from the left", () => {
    expect(FLOWER_GARDEN_ARRANGED_LAYOUTS.side).toBeUndefined();
  });

  it("is only as wide as the beds upright", () => {
    expect(gridFor(UPRIGHT).columns).toBe(6);
  });

  it("fans the bouquet across the whole width on the bottom edge upright", () => {
    const grid = gridFor(UPRIGHT);

    expect(
      ["bouquet-0", "bouquet-15"].map((pileId) => {
        const slot = slotOf(grid, pileId)!;
        return [slot.column, slot.row, slot.anchor];
      }),
    ).toEqual([
      [0, 0, "bottom"],
      [5, 0, "bottom"],
    ]);
  });

  it("centres the foundations next to the beds upright", () => {
    const grid = gridFor(UPRIGHT);

    expect(
      FOUNDATIONS.map((pileId) => {
        const slot = slotOf(grid, pileId)!;
        return [slot.column, slot.row];
      }),
    ).toEqual([
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
    ]);
  });

  describe("on its side", () => {
    const { top, bottom } = FLOWER_GARDEN_ARRANGED_LAYOUTS.landscape;

    it.each([
      ["from the top", top],
      ["on the bottom", bottom],
    ])(
      "stacks the foundations down one rail and the bouquet the other, %s",
      (_name, grid) => {
        const columnsOf = (piles: string[]) => [
          ...new Set(piles.map((pileId) => slotOf(grid, pileId)!.column)),
        ];

        expect([columnsOf(FOUNDATIONS), columnsOf(BOUQUET)]).toEqual([
          [0],
          [7],
        ]);
      },
    );

    it("shows the index of every bouquet card down the rail", () => {
      const tops = BOUQUET.map((pileId) => slotOf(top, pileId)!.offset!.y);
      const steps = tops.slice(1).map((y, index) => y - tops[index]);

      expect(Math.min(...steps)).toBeGreaterThanOrEqual(RAIL_MIN_STEP);
    });
  });
});
