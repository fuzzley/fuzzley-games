import { describe, it, expect } from "vitest";
import {
  CANFIELD_ARRANGED_LAYOUTS,
  CANFIELD_LAYOUT,
} from "@/games/canfield/canfield_layout";
import {
  RESERVE_PILE_ID,
  STOCK_PILE_ID,
  WASTE_PILE_ID,
} from "@/games/canfield/canfield_zones";
import {
  SIDEWAYS,
  UPRIGHT,
  gridChooser,
  itLaysOutArrangedGrids,
  leastRoom,
  slotOf,
} from "@test/support/arranged_grids";

/** Returns the grid a viewport and arrangement call for. */
const gridFor = gridChooser({
  roomy: CANFIELD_LAYOUT,
  arranged: CANFIELD_ARRANGED_LAYOUTS,
});

const COLUMNS = ["tableau-0", "tableau-1", "tableau-2", "tableau-3"];

const FOUNDATIONS = [
  "foundation-0",
  "foundation-1",
  "foundation-2",
  "foundation-3",
];

describe("Canfield's arranged grids", () => {
  itLaysOutArrangedGrids({
    roomy: CANFIELD_LAYOUT,
    arranged: CANFIELD_ARRANGED_LAYOUTS,
    longestColumn: { faceDown: 0, faceUp: 14 },
  });

  it("keeps the reserve out of the columns a mirror holds in order", () => {
    expect(CANFIELD_ARRANGED_LAYOUTS.columns).toEqual(COLUMNS);
  });

  it.each([
    ["at the left", "left", 0],
    ["at the right", "right", 6],
  ] as const)(
    "puts the reserve under the stock upright, the stock %s",
    (_name, side, column) => {
      const grid = gridFor(UPRIGHT, { piles: "top", stockSide: side });

      expect(
        [STOCK_PILE_ID, RESERVE_PILE_ID].map(
          (pileId) => slotOf(grid, pileId)!.column,
        ),
      ).toEqual([column, column]);
    },
  );

  it.each([
    ["at the left", "left"],
    ["at the right", "right"],
  ] as const)(
    "keeps the columns under the foundations upright, the stock %s",
    (_name, side) => {
      const grid = gridFor(UPRIGHT, { piles: "top", stockSide: side });

      const columnsOf = (piles: string[]) =>
        piles.map((pileId) => slotOf(grid, pileId)!.column).sort();

      expect(columnsOf(COLUMNS)).toEqual(columnsOf(FOUNDATIONS));
    },
  );

  it("gives the reserve the columns' room, for Superior Canfield's fan", () => {
    const grid = gridFor(UPRIGHT);

    expect(leastRoom(grid, UPRIGHT, [RESERVE_PILE_ID])).toBe(
      leastRoom(grid, UPRIGHT, COLUMNS),
    );
  });

  describe("on its side", () => {
    const { top, bottom } = CANFIELD_ARRANGED_LAYOUTS.landscape;

    it.each([
      ["at the left", "left", [0, 1, 2, 3, 4, 5]],
      ["at the right", "right", [6, 5, 1, 2, 3, 4]],
    ] as const)(
      "stands the reserve between the stock and the columns, the stock %s",
      (_name, side, columns) => {
        const grid = gridFor(SIDEWAYS, { piles: "top", stockSide: side });

        expect(
          [STOCK_PILE_ID, RESERVE_PILE_ID, ...COLUMNS].map(
            (pileId) => slotOf(grid, pileId)!.column,
          ),
        ).toEqual(columns);
      },
    );

    it.each([
      ["from the top", top],
      ["on the bottom", bottom],
    ])(
      "stands the stock above the waste on the left rail, as declared, %s",
      (_name, grid) => {
        const [stock, waste] = [STOCK_PILE_ID, WASTE_PILE_ID].map((pileId) =>
          slotOf(grid, pileId)!,
        );

        expect([
          stock.column,
          waste.column,
          stock.offset!.y < waste.offset!.y,
        ]).toEqual([0, 0, true]);
      },
    );
  });
});
