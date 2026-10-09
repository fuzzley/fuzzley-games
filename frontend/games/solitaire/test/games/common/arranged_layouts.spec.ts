import { describe, it, expect } from "vitest";
import { CARD_HEIGHT_PX } from "@/engine/render/layout/card_metrics";
import { PileLayout } from "@/engine/render/layout/pile_layout";
import {
  TableLayoutSpec,
  tableLayout,
} from "@/engine/render/layout/table_layout";
import {
  PHONE_FAN_FIT,
  ROOMY_FAN_FIT,
  TABLEAU_HOVER_EXPANSION_OFFSET,
} from "@/games/common/pile_layouts";
import {
  ArrangedBoard,
  RAIL_MIN_STEP,
  arrangedLayouts,
} from "@/games/common/arranged_layouts";
import {
  COVERED_FOUNDATION_PLACEHOLDER,
  FOUNDATION_PLACEHOLDER,
  PLAIN_PLACEHOLDER,
  RAIL_FOUNDATION_PLACEHOLDER,
} from "@/games/common/zone_presets";

const COLUMNS = ["col-0", "col-1", "col-2", "col-3", "col-4"];

/** The row of piles above the columns on a larger screen. */
const ROW = [
  { pileId: "stock", column: 0 },
  { pileId: "waste", column: 1 },
  { pileId: "found-0", column: 3 },
  { pileId: "found-1", column: 4 },
];

/** The made-up board's grid for a larger screen, the row above the columns. */
const ROOMY = tableLayout({
  columns: 5,
  rows: 2,
  slots: [
    ...ROW.map(({ pileId, column }) => ({ pileId, column, row: 0 })),
    ...COLUMNS.map((pileId, column) => ({ pileId, column, row: 1 })),
  ],
  designHeightPx: 900,
});

/** A made-up board: five columns, a stock and waste, and two foundations. */
const BOARD: ArrangedBoard = {
  roomy: ROOMY,
  columns: COLUMNS,
  row: ROW,
  side: "stock",
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

/** Returns how far down its grid cell a pile sits. */
function topOf(grid: TableLayoutSpec, pileId: string): number {
  return slotOf(grid, pileId)?.offset?.y ?? 0;
}

/** Returns how a pile arranges its cards on a grid, given its own spread. */
function arrangementOn(grid: TableLayoutSpec, pileId: string): PileLayout {
  return grid.pileLayouts?.[pileId]?.(SPREAD) ?? SPREAD;
}

/**
 * Returns the artwork a pile's placeholder shows on a grid, given what its
 * game asks for: a foundation's ring unless told otherwise.
 */
function artworkOn(
  grid: TableLayoutSpec,
  pileId: string,
  own: string = FOUNDATION_PLACEHOLDER,
): string {
  return grid.pileBackgrounds?.[pileId]?.(own) ?? own;
}

/** Returns how tall the longest column stands with every fan at its floor. */
const LONGEST =
  CARD_HEIGHT_PX +
  3 * PHONE_FAN_FIT.minFaceDownGap +
  7 * PHONE_FAN_FIT.minFaceUpGap +
  TABLEAU_HOVER_EXPANSION_OFFSET;

describe("arrangedLayouts", () => {
  const layouts = arrangedLayouts(BOARD);
  const phoneGrids: [string, TableLayoutSpec][] = [
    ["piles above", layouts.portrait.top],
    ["piles below", layouts.portrait.bottom],
    ["rails from the top", layouts.landscape.top],
    ["rails on the bottom", layouts.landscape.bottom],
  ];
  const grids: [string, TableLayoutSpec][] = [
    ["larger screen's piles below", layouts.roomy.bottom],
    ...phoneGrids,
  ];

  it.each(grids)("places every pile once with the %s", (_name, grid) => {
    const placed = grid.slots.map((slot) => slot.pileId).sort();

    expect(placed).toEqual(
      [...COLUMNS, "stock", "waste", "found-0", "found-1"].sort(),
    );
  });

  it.each(phoneGrids)("fits the fans with the %s", (_name, grid) => {
    expect(grid.fanFit).toEqual(PHONE_FAN_FIT);
  });

  it.each(phoneGrids)(
    "keeps the longest column on screen with the %s",
    (_name, grid) => {
      const above = grid === layouts.portrait.top ? CARD_HEIGHT_PX + 10 : 0;
      const below = grid === layouts.portrait.bottom ? CARD_HEIGHT_PX + 10 : 0;

      expect(grid.designHeightPx! - 2 * grid.padding.y).toBeGreaterThanOrEqual(
        above + LONGEST + below,
      );
    },
  );

  it("names the columns, which a mirror keeps in order", () => {
    expect(layouts.columns).toEqual(COLUMNS);
  });

  it("names the side pile, whose side decides the mirror", () => {
    expect(layouts.side).toBe("stock");
  });

  describe("a larger screen, piles above", () => {
    it("is the board's own grid", () => {
      expect(layouts.roomy.top).toBe(ROOMY);
    });
  });

  describe("a larger screen, piles below", () => {
    const grid = layouts.roomy.bottom;

    it("keeps the larger screen's gaps and padding", () => {
      expect([grid.gap, grid.padding]).toEqual([ROOMY.gap, ROOMY.padding]);
    });

    it("keeps the larger screen's height when the longest column fits", () => {
      const roomy = tableLayout({ ...ROOMY, designHeightPx: 2000 });

      expect(
        arrangedLayouts({ ...BOARD, roomy }).roomy.bottom.designHeightPx,
      ).toBe(2000);
    });

    it("grows tall enough to keep the longest column clear of the row", () => {
      const longest =
        CARD_HEIGHT_PX +
        3 * ROOMY_FAN_FIT.minFaceDownGap +
        7 * ROOMY_FAN_FIT.minFaceUpGap +
        TABLEAU_HOVER_EXPANSION_OFFSET;

      expect(grid.designHeightPx! - 2 * grid.padding.y).toBe(
        longest + grid.gap.y + CARD_HEIGHT_PX,
      );
    });

    it("lays the columns out along the top", () => {
      expect(slotOf(grid, "col-2")).toEqual({
        pileId: "col-2",
        column: 2,
        row: 0,
      });
    });

    it("puts the row along the bottom edge, in its own columns", () => {
      expect(
        ["stock", "waste", "found-0"].map((pileId) => slotOf(grid, pileId)),
      ).toEqual([
        { pileId: "stock", column: 0, row: 0, anchor: "bottom" },
        { pileId: "waste", column: 1, row: 0, anchor: "bottom" },
        { pileId: "found-0", column: 3, row: 0, anchor: "bottom" },
      ]);
    });

    it("fits the fans to the room above the row, never wider than their own gaps", () => {
      expect(grid.fanFit).toEqual(ROOMY_FAN_FIT);
    });
  });

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

    it("puts the row along the bottom edge, in its own columns", () => {
      expect(
        ["stock", "waste", "found-0"].map((pileId) => slotOf(grid, pileId)),
      ).toEqual([
        { pileId: "stock", column: 0, row: 0, anchor: "bottom" },
        { pileId: "waste", column: 1, row: 0, anchor: "bottom" },
        { pileId: "found-0", column: 3, row: 0, anchor: "bottom" },
      ]);
    });

    it("leaves the piles' arrangements alone", () => {
      expect(arrangementOn(grid, "waste")).toBe(SPREAD);
    });
  });

  describe("on its side, rails from the top", () => {
    const grid = layouts.landscape.top;

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
      expect([topOf(grid, "stock"), topOf(grid, "waste")]).toEqual([
        0,
        CARD_HEIGHT_PX + 10,
      ]);
    });

    it("turns a pile's spread down the rail", () => {
      expect(arrangementOn(grid, "waste")).toMatchObject({
        direction: "down",
      });
    });
  });

  describe("on its side, rails on the bottom", () => {
    const grid = layouts.landscape.bottom;

    it("puts the columns and the rails where the rails from the top do", () => {
      const columnsOf = (spec: TableLayoutSpec) =>
        spec.slots.map((slot) => [slot.pileId, slot.column]);

      expect(columnsOf(grid)).toEqual(columnsOf(layouts.landscape.top));
    });

    it("leaves the columns hanging from the top", () => {
      expect(slotOf(grid, "col-0")).toEqual({
        pileId: "col-0",
        column: 1,
        row: 0,
      });
    });

    it("stands each rail on the bottom edge", () => {
      expect(
        ["found-0", "stock"].map((pileId) => slotOf(grid, pileId)?.anchor),
      ).toEqual(["bottom", "bottom"]);
    });

    it("keeps a rail's piles in their order, as far apart as from the top", () => {
      expect(topOf(grid, "waste") - topOf(grid, "stock")).toBe(
        CARD_HEIGHT_PX + 10,
      );
    });

    it("ends the stack's last pile, spread and all, at the bottom edge", () => {
      // The waste reaches 110 below its own card.
      expect(topOf(grid, "waste")).toBe(-110);
    });

    it("turns a pile's spread down the rail", () => {
      expect(arrangementOn(grid, "waste")).toMatchObject({
        direction: "down",
      });
    });

    it("marks the foundations as the rails from the top do", () => {
      expect(
        ["found-0", "found-1"].map((pileId) => artworkOn(grid, pileId)),
      ).toEqual(
        ["found-0", "found-1"].map((pileId) =>
          artworkOn(layouts.landscape.top, pileId),
        ),
      );
    });
  });

  describe("a rail short of room", () => {
    /** Returns the sideways grid with every foundation on one rail. */
    function crowded(foundations: number): TableLayoutSpec {
      const ids = Array.from(
        { length: foundations },
        (_, index) => `found-${index}`,
      );
      return arrangedLayouts({
        roomy: ROOMY,
        columns: COLUMNS,
        row: ids.map((pileId, column) => ({ pileId, column })),
        side: "found-0",
        rails: {
          left: ids.map((pileId) => ({ pileId, overlapped: true })),
          right: [],
        },
        longestColumn: { faceDown: 0, faceUp: 4 },
      }).landscape.top;
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

    it("opens a covered foundation at the bottom, with its ring at the top", () => {
      const grid = crowded(4);

      expect(
        ["found-0", "found-1", "found-2"].map((pileId) =>
          artworkOn(grid, pileId),
        ),
      ).toEqual([
        COVERED_FOUNDATION_PLACEHOLDER,
        COVERED_FOUNDATION_PLACEHOLDER,
        COVERED_FOUNDATION_PLACEHOLDER,
      ]);
    });

    it("closes the last foundation down the rail, with its ring at the top", () => {
      expect(artworkOn(crowded(4), "found-3")).toBe(
        RAIL_FOUNDATION_PLACEHOLDER,
      );
    });

    it("leaves any other artwork an overlapped pile shows alone", () => {
      expect(artworkOn(crowded(4), "found-0", PLAIN_PLACEHOLDER)).toBe(
        PLAIN_PLACEHOLDER,
      );
    });
  });

  describe("placeholders", () => {
    it("closes a foundation the next pile down the rail clears", () => {
      expect(artworkOn(layouts.landscape.top, "found-0")).toBe(
        RAIL_FOUNDATION_PLACEHOLDER,
      );
    });

    it("leaves a rail pile that may not be overlapped alone", () => {
      expect(artworkOn(layouts.landscape.top, "stock")).toBe(
        FOUNDATION_PLACEHOLDER,
      );
    });

    it.each([
      ["piles above", layouts.portrait.top],
      ["piles below", layouts.portrait.bottom],
    ])("keeps the foundation's ring upright, with the %s", (_name, grid) => {
      expect(artworkOn(grid, "found-0")).toBe(FOUNDATION_PLACEHOLDER);
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
    const own = arrangedLayouts({ ...BOARD, pileLayouts: { stock: slivers } });

    expect(
      [own.portrait.top, own.portrait.bottom, own.landscape.top].map((grid) =>
        arrangementOn(grid, "stock"),
      ),
    ).toEqual([slivers(), slivers(), slivers()]);
  });

  it("leaves the larger screen's piles to arrange themselves", () => {
    const own = arrangedLayouts({
      ...BOARD,
      pileLayouts: { stock: () => SPREAD },
    });

    expect(own.roomy.bottom.pileLayouts).toBeUndefined();
  });

  it("refuses a pile in the row that is on no rail", () => {
    expect(() =>
      arrangedLayouts({
        ...BOARD,
        rails: { ...BOARD.rails, left: BOARD.rails.left.slice(1) },
      }),
    ).toThrow(/found-0/);
  });

  it("refuses a pile that is on both rails", () => {
    expect(() =>
      arrangedLayouts({
        ...BOARD,
        rails: {
          left: BOARD.rails.left,
          right: [...BOARD.rails.right, { pileId: "found-0" }],
        },
      }),
    ).toThrow(/found-0/);
  });

  it("refuses a side pile that is not in the row", () => {
    expect(() => arrangedLayouts({ ...BOARD, side: "col-0" })).toThrow(
      /col-0/,
    );
  });

  it("leaves a board without a side pile without one", () => {
    const layouts = arrangedLayouts({ ...BOARD, side: undefined });

    expect(layouts.side).toBeUndefined();
  });
});
