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
