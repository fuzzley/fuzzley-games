import { describe, it, expect } from "vitest";
import { CARD_HEIGHT_PX } from "@/engine/render/layout/card_metrics";
import {
  PileLayout,
  mirrorPileLayout,
} from "@/engine/render/layout/pile_layout";
import { TableLayoutSpec } from "@/engine/render/layout/table_layout";
import { measureTable } from "@/engine/render/layout/table_metrics";
import { ROOMY_FAN_FIT } from "@/games/common/pile_layouts";
import {
  COVERED_FOUNDATION_PLACEHOLDER,
  FOUNDATION_PLACEHOLDER,
  RAIL_FOUNDATION_PLACEHOLDER,
} from "@/games/common/zone_presets";
import {
  SPIDER_ARRANGED_LAYOUTS,
  SPIDER_LAYOUT,
} from "@/games/spider/spider_layout";
import { STOCK_PILE_ID, spiderZoneSpecs } from "@/games/spider/spider_zones";
import {
  DESKTOP,
  UPRIGHT,
  gridChooser,
  itLaysOutArrangedGrids,
  slotOf,
} from "@test/support/arranged_grids";

/** Returns the grid a viewport and arrangement call for. */
const gridFor = gridChooser({
  roomy: SPIDER_LAYOUT,
  arranged: SPIDER_ARRANGED_LAYOUTS,
});

/** The stock's own arrangement, before any grid changes it. */
const OWN_STOCK = spiderZoneSpecs().find(
  (zone) => zone.id === STOCK_PILE_ID,
)!.layout;

/** Returns how the stock arranges its cards on a grid, mirror and all. */
function stockOn(grid: TableLayoutSpec): PileLayout {
  const chosen = grid.pileLayouts?.[STOCK_PILE_ID]?.(OWN_STOCK) ?? OWN_STOCK;
  return grid.mirrored ? mirrorPileLayout(chosen) : chosen;
}

describe("Spider's arranged grids", () => {
  // Five hidden cards under fifteen face up.
  itLaysOutArrangedGrids({
    roomy: SPIDER_LAYOUT,
    arranged: SPIDER_ARRANGED_LAYOUTS,
    longestColumn: { faceDown: 5, faceUp: 15 },
  });

  it("puts the stock at the bottom right of an upright phone by default", () => {
    expect(slotOf(gridFor(UPRIGHT), STOCK_PILE_ID)).toEqual({
      pileId: STOCK_PILE_ID,
      column: 9,
      row: 0,
      anchor: "bottom",
    });
  });

  it("keeps the longest column clear of the piles along the bottom of a larger screen", () => {
    const grid = gridFor(DESKTOP, { piles: "bottom", stockSide: "auto" });
    const longest =
      CARD_HEIGHT_PX +
      5 * ROOMY_FAN_FIT.minFaceDownGap +
      14 * ROOMY_FAN_FIT.minFaceUpGap;

    expect(
      measureTable(grid, DESKTOP).rooms.get("tableau-9"),
    ).toBeGreaterThanOrEqual(longest);
  });

  describe("on its side", () => {
    const { top, bottom } = SPIDER_ARRANGED_LAYOUTS.landscape;

    it("tops the right rail with the stock, from the top", () => {
      expect(slotOf(top, STOCK_PILE_ID)).toMatchObject({
        column: 10,
        offset: { x: 0, y: 0 },
      });
    });

    it.each([
      ["from the top", top],
      ["on the bottom", bottom],
    ])(
      "stacks the foundations down the same rail, below the stock, %s",
      (_name, grid) => {
        const stockTop = slotOf(grid, STOCK_PILE_ID)!.offset!.y;
        const foundations = grid.slots.filter((slot) =>
          slot.pileId.startsWith("foundation"),
        );

        expect(
          foundations.every(
            (slot) => slot.column === 10 && slot.offset!.y > stockTop,
          ),
        ).toBe(true);
      },
    );

    it.each([
      ["from the top", top],
      ["on the bottom", bottom],
    ])(
      "marks each foundation at its top edge down the rail, the last one closed, %s",
      (_name, grid) => {
        const artwork = Array.from({ length: 8 }, (_, index) =>
          grid.pileBackgrounds?.[`foundation-${index}`]?.(
            FOUNDATION_PLACEHOLDER,
          ),
        );

        expect(artwork).toEqual([
          ...Array<string>(7).fill(COVERED_FOUNDATION_PLACEHOLDER),
          RAIL_FOUNDATION_PLACEHOLDER,
        ]);
      },
    );
  });

  it("shows the stock as one sliver for each deal on every phone grid", () => {
    const grids = [
      gridFor(UPRIGHT, { piles: "top", stockSide: "left" }),
      gridFor(UPRIGHT),
      SPIDER_ARRANGED_LAYOUTS.landscape.top,
      SPIDER_ARRANGED_LAYOUTS.landscape.bottom,
    ];

    expect(grids.map((grid) => stockOn(grid))).toEqual([
      expect.objectContaining({ direction: "right", groupSize: 10 }),
      expect.objectContaining({ direction: "left", groupSize: 10 }),
      expect.objectContaining({ direction: "down", groupSize: 10 }),
      expect.objectContaining({ direction: "down", groupSize: 10 }),
    ]);
  });

  it.each([
    ["piles above", SPIDER_ARRANGED_LAYOUTS.roomy.top],
    ["piles below", SPIDER_ARRANGED_LAYOUTS.roomy.bottom],
  ])(
    "leaves the stock stacked on a larger screen, with the %s",
    (_name, grid) => {
      expect(grid.pileLayouts).toBeUndefined();
    },
  );
});
