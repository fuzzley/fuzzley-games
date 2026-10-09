import { describe, it, expect } from "vitest";
import {
  NESTOR_ARRANGED_LAYOUTS,
  NESTOR_LAYOUT,
} from "@/games/nestor/nestor_layout";
import { DISCARD_PILE_ID } from "@/games/nestor/nestor_zones";
import { TABLEAU_HOVER_EXPANSION_OFFSET } from "@/games/common/pile_layouts";
import { computeScale } from "@/engine/render/layout/table_layout";
import {
  RAIL,
  SIDEWAYS,
  UPRIGHT,
  columnHeightAtFloors,
  phone,
  gridChooser,
  itLaysOutArrangedGrids,
  slotOf,
} from "@test/support/arranged_grids";

/** Returns the grid a viewport and arrangement call for. */
const gridFor = gridChooser({
  roomy: NESTOR_LAYOUT,
  arranged: NESTOR_ARRANGED_LAYOUTS,
});

const RESERVE = ["reserve-0", "reserve-1", "reserve-2", "reserve-3"];

/** The six dealt cards, the most a column ever holds. */
const DEALT = { faceDown: 0, faceUp: 6 };

describe("Nestor's arranged grids", () => {
  itLaysOutArrangedGrids({
    roomy: NESTOR_LAYOUT,
    arranged: NESTOR_ARRANGED_LAYOUTS,
    longestColumn: DEALT,
  });

  it("puts the reserve at the bottom right of an upright phone and the discard at the bottom left by default", () => {
    const grid = gridFor(UPRIGHT);

    expect(
      [...RESERVE, DISCARD_PILE_ID].map(
        (pileId) => slotOf(grid, pileId)!.column,
      ),
    ).toEqual([7, 6, 5, 4, 0]);
  });

  describe("on its side", () => {
    const { top, bottom } = NESTOR_ARRANGED_LAYOUTS.landscape;

    it.each([
      ["from the top", top],
      ["on the bottom", bottom],
    ])(
      "stacks the reserve above the discard on one rail, %s",
      (_name, grid) => {
        const slots = [...RESERVE, DISCARD_PILE_ID].map((pileId) =>
          slotOf(grid, pileId)!,
        );
        const tops = slots.map((slot) => slot.offset!.y);

        expect([new Set(slots.map((slot) => slot.column)).size, tops]).toEqual([
          1,
          [...tops].sort((a, b) => a - b),
        ]);
      },
    );

    it("leaves the discard clear of the last reserve card", () => {
      const lastReserve = slotOf(top, "reserve-3")!.offset!.y;
      const discard = slotOf(top, DISCARD_PILE_ID)!.offset!.y;

      expect(discard - lastReserve).toBeGreaterThan(top.cardSize.height);
    });

    it.each([
      ["640 × 300", phone(640, 300, RAIL)],
      ["780 × 340", SIDEWAYS],
      ["932 × 380", phone(932, 380, RAIL)],
    ])(
      "draws the cards no smaller than the columns alone would at %s",
      (_name, viewport) => {
        // The same grid, only as tall as a column of six needs.
        const alone = computeScale(
          {
            ...top,
            designHeightPx:
              columnHeightAtFloors(DEALT) +
              TABLEAU_HOVER_EXPANSION_OFFSET +
              2 * top.padding.y,
          },
          viewport,
        );

        expect(computeScale(top, viewport)).toBe(alone);
      },
    );
  });
});
