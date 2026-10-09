import { describe, it, expect } from "vitest";
import { CARD_HEIGHT_PX } from "@/engine/render/layout/card_metrics";
import {
  PileLayout,
  mirrorPileLayout,
} from "@/engine/render/layout/pile_layout";
import {
  TableLayoutSpec,
  measureTable,
} from "@/engine/render/layout/table_layout";
import { ROOMY_FAN_FIT } from "@/games/common/pile_layouts";
import {
  COVERED_FOUNDATION_PLACEHOLDER,
  FOUNDATION_PLACEHOLDER,
  RAIL_FOUNDATION_PLACEHOLDER,
} from "@/games/common/zone_presets";
import {
  KLONDIKE_ARRANGED_LAYOUTS,
  KLONDIKE_LAYOUT,
} from "@/games/klondike/klondike_layout";
import {
  STOCK_PILE_ID,
  WASTE_PILE_ID,
  klondikeZoneSpecs,
} from "@/games/klondike/klondike_zones";
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
  roomy: KLONDIKE_LAYOUT,
  arranged: KLONDIKE_ARRANGED_LAYOUTS,
});

const FOUNDATIONS = [
  "foundation-0",
  "foundation-1",
  "foundation-2",
  "foundation-3",
];

describe("Klondike's arranged grids", () => {
  // Six hidden cards under a run from king to two.
  itLaysOutArrangedGrids({
    roomy: KLONDIKE_LAYOUT,
    arranged: KLONDIKE_ARRANGED_LAYOUTS,
    longestColumn: { faceDown: 6, faceUp: 12 },
  });

  it("puts the stock at the bottom right of an upright phone by default", () => {
    expect(slotOf(gridFor(UPRIGHT), STOCK_PILE_ID)).toEqual({
      pileId: STOCK_PILE_ID,
      column: 6,
      row: 0,
      anchor: "bottom",
    });
  });

  it("puts the foundations along the bottom left of an upright phone by default", () => {
    const grid = gridFor(UPRIGHT);

    const columns = FOUNDATIONS.map(
      (pileId) => slotOf(grid, pileId)?.column,
    ).sort();

    expect(columns).toEqual([0, 1, 2, 3]);
  });

  it("puts the piles along the bottom of a larger screen when asked", () => {
    const grid = gridFor(DESKTOP, { piles: "bottom", stockSide: "auto" });

    expect(slotOf(grid, STOCK_PILE_ID)).toEqual({
      pileId: STOCK_PILE_ID,
      column: 0,
      row: 0,
      anchor: "bottom",
    });
  });

  it("keeps six hidden cards under eleven face up clear of the piles along the bottom of a larger screen", () => {
    const grid = gridFor(DESKTOP, { piles: "bottom", stockSide: "auto" });
    const longest =
      CARD_HEIGHT_PX +
      6 * ROOMY_FAN_FIT.minFaceDownGap +
      10 * ROOMY_FAN_FIT.minFaceUpGap;

    expect(
      measureTable(grid, DESKTOP).rooms.get("tableau-6"),
    ).toBeGreaterThanOrEqual(longest);
  });

  describe("on its side", () => {
    const { top, bottom } = KLONDIKE_ARRANGED_LAYOUTS.landscape;

    it.each([
      ["from the top", top],
      ["on the bottom", bottom],
    ])("stacks the foundations down the left rail, %s", (_name, grid) => {
      const columns = new Set(
        FOUNDATIONS.map((pileId) => slotOf(grid, pileId)?.column),
      );

      expect([...columns]).toEqual([0]);
    });

    it("tops the right rail with the stock, from the top", () => {
      expect(slotOf(top, STOCK_PILE_ID)).toMatchObject({
        column: 8,
        offset: { x: 0, y: 0 },
      });
    });

    it("stands the stock and waste on the foot of the right rail by default", () => {
      const grid = gridFor(SIDEWAYS);

      expect(
        [STOCK_PILE_ID, WASTE_PILE_ID].map((pileId) => slotOf(grid, pileId)),
      ).toEqual([
        expect.objectContaining({ column: 8, anchor: "bottom" }),
        expect.objectContaining({ column: 8, anchor: "bottom" }),
      ]);
    });

    it("keeps the stock above the waste on the bottom", () => {
      expect(slotOf(bottom, STOCK_PILE_ID)!.offset!.y).toBeLessThan(
        slotOf(bottom, WASTE_PILE_ID)!.offset!.y,
      );
    });

    it.each([
      ["from the top", top],
      ["on the bottom", bottom],
    ])(
      "marks each foundation at its top edge down the rail, the last one closed, %s",
      (_name, grid) => {
        const artwork = FOUNDATIONS.map((pileId) =>
          grid.pileBackgrounds?.[pileId]?.(FOUNDATION_PLACEHOLDER),
        );

        expect(artwork).toEqual([
          COVERED_FOUNDATION_PLACEHOLDER,
          COVERED_FOUNDATION_PLACEHOLDER,
          COVERED_FOUNDATION_PLACEHOLDER,
          RAIL_FOUNDATION_PLACEHOLDER,
        ]);
      },
    );
  });

  describe.each([1, 3] as const)("the waste of a draw %i", (drawCount) => {
    const own = klondikeZoneSpecs(drawCount).find(
      (zone) => zone.id === WASTE_PILE_ID,
    )!.layout;

    /** Returns how the waste arranges its cards on a grid, mirror and all. */
    function wasteOn(grid: TableLayoutSpec): PileLayout {
      const chosen = grid.pileLayouts?.[WASTE_PILE_ID]?.(own) ?? own;
      return grid.mirrored ? mirrorPileLayout(chosen) : chosen;
    }

    it("spreads towards the stock beside it, upright, by default", () => {
      expect(wasteOn(gridFor(UPRIGHT))).toMatchObject({
        direction: "left",
      });
    });

    it("spreads away from a stock at the left, upright", () => {
      const grid = gridFor(UPRIGHT, {
        piles: "auto",
        stockSide: "left",
      });

      expect(wasteOn(grid)).toMatchObject({ direction: "right" });
    });

    it.each([
      ["from the top", KLONDIKE_ARRANGED_LAYOUTS.landscape.top],
      ["on the bottom", KLONDIKE_ARRANGED_LAYOUTS.landscape.bottom],
    ])("spreads down under the stock on its side, %s", (_name, grid) => {
      expect(wasteOn(grid)).toMatchObject({ direction: "down" });
    });

    it("keeps the draw's count of spread cards on every grid", () => {
      const { roomy, portrait, landscape } = KLONDIKE_ARRANGED_LAYOUTS;
      const grids = [
        roomy.bottom,
        portrait.bottom,
        portrait.top,
        landscape.top,
        landscape.bottom,
      ];

      const shown = grids.map((grid) => {
        const waste = wasteOn(grid);
        return waste.kind === "spread" ? waste.maxVisible : null;
      });

      expect(shown).toEqual(Array(5).fill(drawCount === 1 ? 1 : 3));
    });
  });
});
