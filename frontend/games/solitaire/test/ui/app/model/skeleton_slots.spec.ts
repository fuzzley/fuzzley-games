import { describe, it, expect } from "vitest";
import { tableLayout } from "@/engine/render/layout/table_layout";
import { skeletonSlots } from "@/ui/app/model/skeleton_slots";

/** A board four columns by two rows, with one slot between grid lines. */
const LAYOUT = tableLayout({
  columns: 4,
  rows: 2,
  slots: [
    { pileId: "corner", column: 0, row: 0 },
    { pileId: "between", column: 1.5, row: 0.5 },
    { pileId: "last", column: 3, row: 1 },
  ],
});

describe("skeletonSlots", () => {
  it("places a slot at its column and row as shares of the board", () => {
    const [, , last] = skeletonSlots(LAYOUT);

    expect([last?.left, last?.top]).toEqual(["75%", "50%"]);
  });

  it("places a fractional slot between grid lines", () => {
    const [, between] = skeletonSlots(LAYOUT);

    expect([between?.left, between?.top]).toEqual(["37.5%", "25%"]);
  });

  it("sizes every slot as one grid cell", () => {
    const sizes = skeletonSlots(LAYOUT).map(({ width, height }) => [
      width,
      height,
    ]);

    expect(sizes).toEqual(Array(3).fill(["25%", "50%"]));
  });

  it("keeps the pile each slot stands in for", () => {
    const piles = skeletonSlots(LAYOUT).map((slot) => slot.pileId);

    expect(piles).toEqual(["corner", "between", "last"]);
  });
});

describe("skeletonSlots on a grid with anchored and offset slots", () => {
  const anchored = tableLayout({
    columns: 4,
    rows: 3,
    slots: [
      { pileId: "floor", column: 1, row: 0, anchor: "bottom" },
      { pileId: "above", column: 2, row: 1, anchor: "bottom" },
    ],
  });

  it("puts row 0 of a bottom-anchored slot in the last row", () => {
    const [floor] = skeletonSlots(anchored);

    expect(floor?.top).toBe(`${(2 / 3) * 100}%`);
  });

  it("counts a bottom-anchored row up from the last", () => {
    const [, above] = skeletonSlots(anchored);

    expect(above?.top).toBe(`${(1 / 3) * 100}%`);
  });

  it("moves an offset slot by its offset, in grid cells", () => {
    const { cardSize, gap } = anchored;
    const offset = {
      x: (cardSize.width + gap.x) / 2,
      y: cardSize.height + gap.y,
    };
    const [slot] = skeletonSlots({
      ...anchored,
      slots: [{ pileId: "nudged", column: 0, row: 0, offset }],
    });

    expect([slot?.left, slot?.top]).toEqual(["12.5%", `${(1 / 3) * 100}%`]);
  });
});
