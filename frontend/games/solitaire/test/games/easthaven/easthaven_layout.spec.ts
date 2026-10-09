import { describe, it, expect } from "vitest";
import { CARD_HEIGHT_PX } from "@/engine/render/layout/card_metrics";
import { measureTable } from "@/engine/render/layout/table_layout";
import { ROOMY_FAN_FIT } from "@/games/common/pile_layouts";
import {
  EASTHAVEN_ARRANGED_LAYOUTS,
  EASTHAVEN_LAYOUT,
} from "@/games/easthaven/easthaven_layout";
import {
  STOCK_PILE_ID,
  easthavenZoneSpecs,
} from "@/games/easthaven/easthaven_zones";
import {
  DESKTOP,
  UPRIGHT,
  gridChooser,
  itLaysOutArrangedGrids,
  layoutOn,
  slotOf,
} from "@test/support/arranged_grids";

/** Returns the grid a viewport and arrangement call for. */
const gridFor = gridChooser({
  roomy: EASTHAVEN_LAYOUT,
  arranged: EASTHAVEN_ARRANGED_LAYOUTS,
});

/** The stock's own arrangement, before any grid changes it. */
const OWN_STOCK = easthavenZoneSpecs().find(
  (zone) => zone.id === STOCK_PILE_ID,
)!.layout;

const FOUNDATIONS = [
  "foundation-0",
  "foundation-1",
  "foundation-2",
  "foundation-3",
];

describe("Easthaven's arranged grids", () => {
  itLaysOutArrangedGrids({
    roomy: EASTHAVEN_LAYOUT,
    arranged: EASTHAVEN_ARRANGED_LAYOUTS,
    longestColumn: { faceDown: 2, faceUp: 14 },
  });

  it("puts the stock at the bottom right of an upright phone by default", () => {
    expect(slotOf(gridFor(UPRIGHT), STOCK_PILE_ID)).toEqual({
      pileId: STOCK_PILE_ID,
      column: 6,
      row: 0,
      anchor: "bottom",
    });
  });

  it("keeps two hidden cards under twelve face up clear of the piles along the bottom of a larger screen", () => {
    const grid = gridFor(DESKTOP, { piles: "bottom", stockSide: "auto" });
    const longest =
      CARD_HEIGHT_PX +
      2 * ROOMY_FAN_FIT.minFaceDownGap +
      11 * ROOMY_FAN_FIT.minFaceUpGap;

    expect(
      measureTable(grid, DESKTOP).rooms.get("tableau-6"),
    ).toBeGreaterThanOrEqual(longest);
  });

  describe("on its side", () => {
    const { top, bottom } = EASTHAVEN_ARRANGED_LAYOUTS.landscape;

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

  it("shows the stock as one sliver for each deal on every phone grid", () => {
    const grids = [
      gridFor(UPRIGHT, { piles: "top", stockSide: "left" }),
      gridFor(UPRIGHT),
      EASTHAVEN_ARRANGED_LAYOUTS.landscape.top,
      EASTHAVEN_ARRANGED_LAYOUTS.landscape.bottom,
    ];

    expect(
      grids.map((grid) => layoutOn(grid, STOCK_PILE_ID, OWN_STOCK)),
    ).toEqual([
      expect.objectContaining({ direction: "right", groupSize: 7 }),
      expect.objectContaining({ direction: "left", groupSize: 7 }),
      expect.objectContaining({ direction: "down", groupSize: 7 }),
      expect.objectContaining({ direction: "down", groupSize: 7 }),
    ]);
  });

  it("leaves the stock stacked on a larger screen", () => {
    expect(EASTHAVEN_ARRANGED_LAYOUTS.roomy.bottom.pileLayouts).toBeUndefined();
  });
});
