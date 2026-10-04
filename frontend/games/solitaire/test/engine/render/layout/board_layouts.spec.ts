import { describe, it, expect } from "vitest";
import {
  BoardArrangement,
  BoardLayouts,
  DEFAULT_BOARD_ARRANGEMENT,
  chooseTableLayout,
  mirrorTable,
} from "@/engine/render/layout/board_layouts";
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
});

describe("chooseTableLayout", () => {
  const roomy = tableLayout({ columns: 1, rows: 1, slots: [] });
  const bottom = tableLayout({ columns: 2, rows: 1, slots: [] });
  const top = tableLayout({ columns: 3, rows: 1, slots: [] });
  const landscape = tableLayout({ columns: 4, rows: 1, slots: [] });
  const LAYOUTS: BoardLayouts = {
    roomy,
    phone: { portrait: { bottom, top }, landscape },
  };
  const LEFT: BoardArrangement = { ...DEFAULT_BOARD_ARRANGEMENT, hand: "left" };

  it("lays a roomy screen out on the roomy grid", () => {
    expect(chooseTableLayout(LAYOUTS, "roomy", DEFAULT_BOARD_ARRANGEMENT)).toBe(
      roomy,
    );
  });

  it("puts an upright phone's piles at the bottom by default", () => {
    expect(
      chooseTableLayout(LAYOUTS, "phone-portrait", DEFAULT_BOARD_ARRANGEMENT),
    ).toBe(bottom);
  });

  it("puts an upright phone's piles at the top when asked", () => {
    expect(
      chooseTableLayout(LAYOUTS, "phone-portrait", {
        ...DEFAULT_BOARD_ARRANGEMENT,
        phonePiles: "top",
      }),
    ).toBe(top);
  });

  it("lays a phone on its side out on the landscape grid", () => {
    expect(
      chooseTableLayout(LAYOUTS, "phone-landscape", DEFAULT_BOARD_ARRANGEMENT),
    ).toBe(landscape);
  });

  it("mirrors the chosen grid for a left hand", () => {
    expect(chooseTableLayout(LAYOUTS, "phone-landscape", LEFT)).toBe(
      mirrorTable(landscape),
    );
  });

  it("mirrors the roomy grid for a left hand too", () => {
    expect(chooseTableLayout(LAYOUTS, "roomy", LEFT)).toBe(mirrorTable(roomy));
  });

  it("lays a game without phone grids out on its roomy grid everywhere", () => {
    expect(chooseTableLayout({ roomy }, "phone-portrait", LEFT)).toBe(roomy);
  });
});
