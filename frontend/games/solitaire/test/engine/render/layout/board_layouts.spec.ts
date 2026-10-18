import { describe, it, expect } from "vitest";
import {
  ArrangedLayouts,
  BoardLayouts,
  chooseTableLayout,
  mirrorTable,
} from "@/engine/render/layout/board_layouts";
import { DEFAULT_BOARD_ARRANGEMENT } from "@/engine/render/layout/board_arrangement";
import {
  TableLayoutSpec,
  tableLayout,
} from "@/engine/render/layout/table_layout";

/** A five-column grid with one slot of every kind. */
const GRID = tableLayout({
  columns: 5,
  rows: 2,
  slots: [
    { pileId: "corner", column: 0, row: 0 },
    { pileId: "between", column: 1.5, row: 1 },
    { pileId: "floor", column: 4, row: 0, anchor: "bottom" },
    { pileId: "nudged", column: 2, row: 0, offset: { x: 30, y: 60 } },
  ],
});

/** Returns the slot for a pile. */
function slotOf(spec: TableLayoutSpec, pileId: string) {
  return spec.slots.find((slot) => slot.pileId === pileId)!;
}

describe("mirrorTable", () => {
  it("puts each slot in the column opposite", () => {
    const mirrored = mirrorTable(GRID);

    expect(
      ["corner", "between", "floor"].map(
        (pileId) => slotOf(mirrored, pileId).column,
      ),
    ).toEqual([4, 2.5, 0]);
  });

  it("keeps each slot's row and anchor", () => {
    expect(slotOf(mirrorTable(GRID), "floor")).toMatchObject({
      row: 0,
      anchor: "bottom",
    });
  });

  it("turns an offset around, left for right", () => {
    expect(slotOf(mirrorTable(GRID), "nudged").offset).toEqual({
      x: -30,
      y: 60,
    });
  });

  it("marks the grid mirrored, which turns its spreads around", () => {
    expect(mirrorTable(GRID).mirrored).toBe(true);
  });

  it("gives back the original slots when mirrored twice", () => {
    const twice = mirrorTable(mirrorTable(GRID));

    expect([twice.slots, twice.mirrored]).toEqual([GRID.slots, false]);
  });

  it("builds a grid's mirror once", () => {
    expect(mirrorTable(GRID)).toBe(mirrorTable(GRID));
  });

  it("keeps the artwork the grid's placeholders show", () => {
    const ring = () => "card-placeholder-full-border-circle";
    const grid = tableLayout({
      ...GRID,
      pileBackgrounds: { corner: ring },
    });

    expect(mirrorTable(grid).pileBackgrounds).toEqual({ corner: ring });
  });
});

describe("mirrorTable keeping columns in order", () => {
  /** Three columns at the left of a five-column grid, a pile at the right. */
  const BOARD = tableLayout({
    columns: 5,
    rows: 1,
    slots: [
      { pileId: "col-0", column: 0, row: 0 },
      { pileId: "col-1", column: 1, row: 0 },
      { pileId: "col-2", column: 2, row: 0 },
      { pileId: "rail", column: 4, row: 0 },
    ],
  });
  const COLUMNS = ["col-0", "col-1", "col-2"];

  it("moves the columns as one block to the mirrored span, in order", () => {
    const mirrored = mirrorTable(BOARD, COLUMNS);

    expect(COLUMNS.map((pileId) => slotOf(mirrored, pileId).column)).toEqual([
      2, 3, 4,
    ]);
  });

  it("mirrors every other pile as usual", () => {
    expect(slotOf(mirrorTable(BOARD, COLUMNS), "rail").column).toBe(0);
  });

  it("keeps a separate mirror for each set of columns kept", () => {
    expect(mirrorTable(BOARD, COLUMNS)).not.toBe(mirrorTable(BOARD));
  });
});

describe("chooseTableLayout", () => {
  /** Returns a one-row grid with the stock in a column of its own. */
  function grid(columns: number, stockColumn: number): TableLayoutSpec {
    return tableLayout({
      columns,
      rows: 1,
      slots: [
        { pileId: "stock", column: stockColumn, row: 0 },
        { pileId: "col-0", column: stockColumn === 0 ? 1 : 0, row: 0 },
      ],
    });
  }

  // Every grid but the sideways ones has the stock at the left, as a game's
  // row does; a game's rails may put it at the right.
  const ARRANGED: ArrangedLayouts = {
    roomy: { top: grid(3, 0), bottom: grid(3, 0) },
    portrait: { top: grid(4, 0), bottom: grid(4, 0) },
    landscape: { top: grid(5, 4), bottom: grid(5, 4) },
    columns: ["col-0"],
    side: "stock",
  };
  const LAYOUTS: BoardLayouts = {
    roomy: ARRANGED.roomy.top,
    arranged: ARRANGED,
  };

  /** Returns a grid as the chooser mirrors it. */
  const mirrored = (spec: TableLayoutSpec) =>
    mirrorTable(spec, ARRANGED.columns);

  it("lays a larger screen out with the piles at the top and the stock at the left by default", () => {
    expect(chooseTableLayout(LAYOUTS, "roomy", DEFAULT_BOARD_ARRANGEMENT)).toBe(
      ARRANGED.roomy.top,
    );
  });

  it("puts an upright phone's piles at the bottom with the stock at the right by default", () => {
    expect(
      chooseTableLayout(LAYOUTS, "phone-portrait", DEFAULT_BOARD_ARRANGEMENT),
    ).toBe(mirrored(ARRANGED.portrait.bottom));
  });

  it("stands a sideways phone's rails on the bottom, the stock at the right, by default", () => {
    expect(
      chooseTableLayout(LAYOUTS, "phone-landscape", DEFAULT_BOARD_ARRANGEMENT),
    ).toBe(ARRANGED.landscape.bottom);
  });

  it.each([
    ["roomy", ARRANGED.roomy],
    ["phone-portrait", ARRANGED.portrait],
    ["phone-landscape", ARRANGED.landscape],
  ] as const)(
    "puts the piles where asked on a %s screen",
    (formFactor, grids) => {
      const chosen = (["top", "bottom"] as const).map((piles) =>
        chooseTableLayout(LAYOUTS, formFactor, { piles, stockSide: "auto" }),
      );

      expect(chosen.map((spec) => spec.columns)).toEqual([
        grids.top.columns,
        grids.bottom.columns,
      ]);
    },
  );

  it("mirrors a grid that has the stock on the other side", () => {
    expect(
      chooseTableLayout(LAYOUTS, "roomy", { piles: "top", stockSide: "right" }),
    ).toBe(mirrored(ARRANGED.roomy.top));
  });

  it("leaves a grid alone when the stock is on the side asked for", () => {
    expect(
      chooseTableLayout(LAYOUTS, "phone-portrait", {
        piles: "top",
        stockSide: "left",
      }),
    ).toBe(ARRANGED.portrait.top);
  });

  it("mirrors a sideways grid for a stock at the left", () => {
    expect(
      chooseTableLayout(LAYOUTS, "phone-landscape", {
        piles: "top",
        stockSide: "left",
      }),
    ).toBe(mirrored(ARRANGED.landscape.top));
  });

  it("leaves a grid alone when the stock sits in its middle column", () => {
    const middle = grid(3, 1);
    const layouts: BoardLayouts = {
      roomy: middle,
      arranged: { ...ARRANGED, roomy: { top: middle, bottom: middle } },
    };

    expect(
      chooseTableLayout(layouts, "roomy", { piles: "top", stockSide: "right" }),
    ).toBe(middle);
  });

  it("never mirrors a board without a side pile", () => {
    const layouts: BoardLayouts = {
      ...LAYOUTS,
      arranged: { ...ARRANGED, side: undefined },
    };

    expect(
      chooseTableLayout(layouts, "roomy", { piles: "top", stockSide: "right" }),
    ).toBe(ARRANGED.roomy.top);
  });

  it("lays a game without arranged grids out on its roomy grid everywhere", () => {
    const roomy = grid(3, 0);

    expect(
      chooseTableLayout({ roomy }, "phone-portrait", {
        piles: "top",
        stockSide: "right",
      }),
    ).toBe(roomy);
  });
});
