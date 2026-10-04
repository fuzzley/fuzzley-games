import { describe, it, expect } from "vitest";
import { CARD_HEIGHT_PX } from "@/engine/render/layout/card_metrics";
import { PileLayout } from "@/engine/render/layout/pile_layout";
import { TableLayoutSpec } from "@/engine/render/layout/table_layout";
import {
  PHONE_FAN_FIT,
  TABLEAU_HOVER_EXPANSION_OFFSET,
} from "@/games/common/pile_layouts";
import {
  PhoneBoard,
  RAIL_MIN_STEP,
  phoneLayouts,
} from "@/games/common/phone_layouts";

const COLUMNS = ["col-0", "col-1", "col-2", "col-3", "col-4"];

/** A made-up board: five columns, a stock and waste, and two foundations. */
const BOARD: PhoneBoard = {
  columns: COLUMNS,
  row: [
    { pileId: "stock", column: 0 },
    { pileId: "waste", column: 1 },
    { pileId: "found-0", column: 3 },
    { pileId: "found-1", column: 4 },
  ],
  rails: {
    left: [
      { pileId: "found-0", overlapped: true },
      { pileId: "found-1", overlapped: true },
    ],
    right: [
      { pileId: "stock" },
      { pileId: "waste", spreadsDown: true, reach: CARD_HEIGHT_PX + 110 },
    ],
  },
  longestColumn: { faceDown: 3, faceUp: 8 },
};

const SPREAD: PileLayout = {
  kind: "spread",
  direction: "right",
  gap: 55,
  maxVisible: 3,
};

/** Returns the slot a grid gives a pile. */
function slotOf(grid: TableLayoutSpec, pileId: string) {
  return grid.slots.find((slot) => slot.pileId === pileId);
}

/** Returns how a pile arranges its cards on a grid, given its own spread. */
function arrangementOn(grid: TableLayoutSpec, pileId: string): PileLayout {
  return grid.pileLayouts?.[pileId]?.(SPREAD) ?? SPREAD;
}

/** Returns how tall the longest column stands with every fan at its floor. */
const LONGEST =
  CARD_HEIGHT_PX +
  3 * PHONE_FAN_FIT.minFaceDownGap +
  7 * PHONE_FAN_FIT.minFaceUpGap +
  TABLEAU_HOVER_EXPANSION_OFFSET;

describe("phoneLayouts", () => {
  const layouts = phoneLayouts(BOARD);
  const grids: [string, TableLayoutSpec][] = [
    ["piles above", layouts.portrait.top],
    ["piles below", layouts.portrait.bottom],
    ["on its side", layouts.landscape],
  ];

  it.each(grids)("places every pile once with the %s", (_name, grid) => {
    const placed = grid.slots.map((slot) => slot.pileId).sort();

    expect(placed).toEqual(
      [...COLUMNS, "stock", "waste", "found-0", "found-1"].sort(),
    );
  });

  it.each(grids)("fits the fans with the %s", (_name, grid) => {
    expect(grid.fanFit).toEqual(PHONE_FAN_FIT);
  });

  it.each(grids)(
    "keeps the longest column on screen with the %s",
    (_name, grid) => {
      const below = grid === layouts.portrait.top ? CARD_HEIGHT_PX + 10 : 0;

      expect(grid.designHeightPx! - 2 * grid.padding.y).toBeGreaterThanOrEqual(
        below + LONGEST,
      );
    },
  );

  describe("upright, piles above", () => {
    const grid = layouts.portrait.top;

    it("keeps the row where a larger screen has it", () => {
      expect(slotOf(grid, "found-0")).toEqual({
        pileId: "found-0",
        column: 3,
        row: 0,
      });
    });

    it("lays the columns out under the row", () => {
      expect(slotOf(grid, "col-2")).toEqual({
        pileId: "col-2",
        column: 2,
        row: 1,
      });
    });

    it("leaves the piles' arrangements alone", () => {
      expect(arrangementOn(grid, "waste")).toBe(SPREAD);
    });
  });

  describe("upright, piles below", () => {
    const grid = layouts.portrait.bottom;

    it("lays the columns out along the top", () => {
      expect(slotOf(grid, "col-0")).toEqual({
        pileId: "col-0",
        column: 0,
        row: 0,
      });
    });

    it("mirrors the row along the bottom edge", () => {
      expect(
        ["stock", "waste", "found-0"].map((pileId) => slotOf(grid, pileId)),
      ).toEqual([
        { pileId: "stock", column: 4, row: 0, anchor: "bottom" },
        { pileId: "waste", column: 3, row: 0, anchor: "bottom" },
        { pileId: "found-0", column: 1, row: 0, anchor: "bottom" },
      ]);
    });

    it("turns the row's spreads around", () => {
      expect(arrangementOn(grid, "waste")).toMatchObject({
        direction: "left",
      });
    });

    it("leaves the columns' arrangements alone", () => {
      expect(grid.pileLayouts?.["col-0"]).toBeUndefined();
    });
  });

  describe("on its side", () => {
    const grid = layouts.landscape;

    it("puts the columns between the rails, from the top", () => {
      expect([grid.columns, slotOf(grid, "col-0")]).toEqual([
        7,
        { pileId: "col-0", column: 1, row: 0 },
      ]);
    });

    it("puts the rails at either edge", () => {
      expect(
        [slotOf(grid, "found-0"), slotOf(grid, "stock")].map(
          (slot) => slot?.column,
        ),
      ).toEqual([0, 6]);
    });

    it("stacks a rail's piles down it, each below the last when they fit", () => {
      expect(
        [slotOf(grid, "stock"), slotOf(grid, "waste")].map(
          (slot) => slot?.offset?.y,
        ),
      ).toEqual([0, CARD_HEIGHT_PX + 10]);
    });

    it("turns a pile's spread down the rail", () => {
      expect(arrangementOn(grid, "waste")).toMatchObject({
        direction: "down",
      });
    });
  });

  describe("a rail short of room", () => {
    /** Returns the sideways grid with every foundation on one rail. */
    function crowded(foundations: number): TableLayoutSpec {
      const ids = Array.from(
        { length: foundations },
        (_, index) => `found-${index}`,
      );
      return phoneLayouts({
        columns: COLUMNS,
        row: ids.map((pileId, column) => ({ pileId, column })),
        rails: {
          left: ids.map((pileId) => ({ pileId, overlapped: true })),
          right: [],
        },
        longestColumn: { faceDown: 0, faceUp: 4 },
      }).landscape;
    }

    /** Returns the gap between successive foundations down the rail. */
    function steps(grid: TableLayoutSpec): number[] {
      const ys = grid.slots
        .filter((slot) => slot.pileId.startsWith("found"))
        .map((slot) => slot.offset!.y);
      return ys.slice(1).map((y, index) => y - ys[index]);
    }

    it("overlaps the piles that allow it evenly", () => {
      expect(new Set(steps(crowded(4))).size).toBe(1);
    });

    it("fits the rail into the height the columns need", () => {
      const grid = crowded(4);
      const lastTop = Math.max(...grid.slots.map((s) => s.offset?.y ?? 0));

      expect(lastTop + CARD_HEIGHT_PX).toBeCloseTo(
        grid.designHeightPx! - 2 * grid.padding.y,
      );
    });

    it("never shows less of a pile than its index, asking for height instead", () => {
      const grid = crowded(12);

      expect(Math.min(...steps(grid))).toBe(RAIL_MIN_STEP);
    });
  });

  it("keeps the board's own arrangement under the grid's", () => {
    const slivers = (): PileLayout => ({
      kind: "spread",
      direction: "right",
      gap: 40,
      maxVisible: Number.POSITIVE_INFINITY,
      groupSize: 10,
    });
    const own = phoneLayouts({ ...BOARD, pileLayouts: { stock: slivers } });

    expect(
      [own.portrait.top, own.portrait.bottom, own.landscape].map((grid) =>
        arrangementOn(grid, "stock"),
      ),
    ).toEqual([slivers(), { ...slivers(), direction: "left" }, slivers()]);
  });

  it("lays a board with no row out in one grid row", () => {
    const bare = phoneLayouts({
      columns: COLUMNS,
      row: [],
      rails: { left: [], right: [] },
      longestColumn: { faceDown: 0, faceUp: 13 },
    });

    expect(
      [bare.portrait.top, bare.portrait.bottom, bare.landscape].map(
        (grid) => grid.rows,
      ),
    ).toEqual([1, 1, 1]);
  });

  it("refuses a pile in the row that is on no rail", () => {
    expect(() =>
      phoneLayouts({
        ...BOARD,
        rails: { ...BOARD.rails, left: BOARD.rails.left.slice(1) },
      }),
    ).toThrow(/found-0/);
  });

  it("refuses a pile that is on both rails", () => {
    expect(() =>
      phoneLayouts({
        ...BOARD,
        rails: {
          left: BOARD.rails.left,
          right: [...BOARD.rails.right, { pileId: "found-0" }],
        },
      }),
    ).toThrow(/found-0/);
  });
});
