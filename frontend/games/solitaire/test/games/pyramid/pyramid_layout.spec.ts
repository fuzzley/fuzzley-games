import { describe, it, expect } from "vitest";
import {
  TableLayoutSpec,
  computeScale,
} from "@/engine/render/layout/table_layout";
import {
  PYRAMID_ARRANGED_LAYOUTS,
  PYRAMID_LAYOUT,
} from "@/games/pyramid/pyramid_layout";
import {
  DISCARD_PILE_ID,
  HAND_PILE_ID,
  STOCK_PILE_ID,
  WASTE_PILE_ID,
} from "@/games/pyramid/pyramid_zones";
import {
  DESKTOP,
  SIDEWAYS,
  UPRIGHT,
  gridChooser,
  itLaysOutArrangedGrids,
  slotOf,
} from "@test/support/arranged_grids";

/** Returns the grid a viewport and arrangement call for. */
const gridFor = gridChooser({
  roomy: PYRAMID_LAYOUT,
  arranged: PYRAMID_ARRANGED_LAYOUTS,
});

/** The cards along the pyramid's base, which nothing lies on. */
const BASE = Array.from({ length: 7 }, (_, index) => `pyramid-6-${index}`);

/** The four piles beside the pyramid. */
const PILES = [STOCK_PILE_ID, HAND_PILE_ID, WASTE_PILE_ID, DISCARD_PILE_ID];

/** Returns where a grid puts the four piles: each one's column and row. */
function pilesOn(grid: TableLayoutSpec) {
  return PILES.map((pileId) => {
    const slot = slotOf(grid, pileId)!;
    return [slot.column, slot.row, slot.anchor ?? "top"];
  });
}

describe("Pyramid's arranged grids", () => {
  itLaysOutArrangedGrids({
    roomy: PYRAMID_LAYOUT,
    arranged: PYRAMID_ARRANGED_LAYOUTS,
    longestColumn: { faceDown: 0, faceUp: 1 },
    roomFor: BASE,
  });

  it("puts the piles along the bottom edge of an upright phone by default, the stock at the right", () => {
    expect(pilesOn(gridFor(UPRIGHT))).toEqual([
      [6, 0, "bottom"],
      [5, 0, "bottom"],
      [1, 0, "bottom"],
      [0, 0, "bottom"],
    ]);
  });

  it("keeps the piles in the corners beside the peak upright with the piles at the top", () => {
    expect(
      pilesOn(gridFor(UPRIGHT, { piles: "top", stockSide: "left" })),
    ).toEqual([
      [0, 0, "top"],
      [1, 0, "top"],
      [5, 0, "top"],
      [6, 0, "top"],
    ]);
  });

  it.each([
    ["a larger screen", DESKTOP],
    ["a sideways phone", SIDEWAYS],
  ])(
    "stands the piles in pairs beside the base on %s with the piles at the bottom",
    (_name, viewport) => {
      expect(
        pilesOn(gridFor(viewport, { piles: "bottom", stockSide: "left" })),
      ).toEqual([
        [0, 2, "top"],
        [0, 3, "top"],
        [8, 2, "top"],
        [8, 3, "top"],
      ]);
    },
  );

  it.each([
    ["a larger screen", DESKTOP],
    ["a sideways phone", SIDEWAYS],
  ])(
    "draws the cards as big with the piles beside the base on %s",
    (_name, viewport) => {
      const top = gridFor(viewport, { piles: "top", stockSide: "left" });
      const bottom = gridFor(viewport, { piles: "bottom", stockSide: "left" });

      expect(computeScale(bottom, viewport)).toBe(computeScale(top, viewport));
    },
  );
});
