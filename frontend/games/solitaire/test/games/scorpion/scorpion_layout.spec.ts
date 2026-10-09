import { describe, it, expect } from "vitest";
import { CARD_HEIGHT_PX } from "@/engine/render/layout/card_metrics";
import { measureTable } from "@/engine/render/layout/table_layout";
import { ROOMY_FAN_FIT } from "@/games/common/pile_layouts";
import {
  SCORPION_ARRANGED_LAYOUTS,
  SCORPION_LAYOUT,
} from "@/games/scorpion/scorpion_layout";
import { STOCK_PILE_ID } from "@/games/scorpion/scorpion_zones";
import {
  DESKTOP,
  UPRIGHT,
  gridChooser,
  itLaysOutArrangedGrids,
  slotOf,
} from "@test/support/arranged_grids";

/** Returns the grid a viewport and arrangement call for. */
const gridFor = gridChooser({
  roomy: SCORPION_LAYOUT,
  arranged: SCORPION_ARRANGED_LAYOUTS,
});

const FOUNDATIONS = [
  "foundation-0",
  "foundation-1",
  "foundation-2",
  "foundation-3",
];

describe("Scorpion's arranged grids", () => {
  itLaysOutArrangedGrids({
    roomy: SCORPION_LAYOUT,
    arranged: SCORPION_ARRANGED_LAYOUTS,
    longestColumn: { faceDown: 3, faceUp: 15 },
  });

  it("puts the stock at the bottom right of an upright phone by default", () => {
    expect(slotOf(gridFor(UPRIGHT), STOCK_PILE_ID)).toEqual({
      pileId: STOCK_PILE_ID,
      column: 6,
      row: 0,
      anchor: "bottom",
    });
  });

  it("keeps three hidden cards under fourteen face up clear of the piles along the bottom of a larger screen", () => {
    const grid = gridFor(DESKTOP, { piles: "bottom", stockSide: "auto" });
    const longest =
      CARD_HEIGHT_PX +
      3 * ROOMY_FAN_FIT.minFaceDownGap +
      13 * ROOMY_FAN_FIT.minFaceUpGap;

    expect(
      measureTable(grid, DESKTOP).rooms.get("tableau-6"),
    ).toBeGreaterThanOrEqual(longest);
  });

  describe("on its side", () => {
    const { top, bottom } = SCORPION_ARRANGED_LAYOUTS.landscape;

    it.each([
      ["from the top", top],
      ["on the bottom", bottom],
    ])(
      "stacks the stock and the foundations down the right rail, %s",
      (_name, grid) => {
        const columns = new Set(
          [STOCK_PILE_ID, ...FOUNDATIONS].map(
            (pileId) => slotOf(grid, pileId)!.column,
          ),
        );

        expect([...columns]).toEqual([7]);
      },
    );

    it.each([
      ["from the top", top],
      ["on the bottom", bottom],
    ])("puts the stock above the foundations, %s", (_name, grid) => {
      const tops = [STOCK_PILE_ID, ...FOUNDATIONS].map(
        (pileId) => slotOf(grid, pileId)!.offset!.y,
      );

      expect(tops).toEqual([...tops].sort((a, b) => a - b));
    });
  });

  it("leaves the stock stacked on every grid, since it deals only once", () => {
    const { roomy, portrait, landscape } = SCORPION_ARRANGED_LAYOUTS;

    expect(
      [roomy.bottom, portrait.top, portrait.bottom, landscape.top].map(
        (grid) => grid.pileLayouts?.[STOCK_PILE_ID],
      ),
    ).toEqual([undefined, undefined, undefined, undefined]);
  });
});
