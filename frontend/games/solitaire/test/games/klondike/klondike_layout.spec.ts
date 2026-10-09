import { describe, it, expect } from "vitest";
import {
  BoardArrangement,
  DEFAULT_BOARD_ARRANGEMENT,
  StockSide,
  chooseTableLayout,
} from "@/engine/render/layout/board_layouts";
import { CARD_HEIGHT_PX } from "@/engine/render/layout/card_metrics";
import { formFactorOf } from "@/engine/render/layout/form_factor";
import {
  PileLayout,
  mirrorPileLayout,
} from "@/engine/render/layout/pile_layout";
import {
  TableLayoutSpec,
  measureTable,
} from "@/engine/render/layout/table_layout";
import {
  Insets,
  NO_INSETS,
  Viewport,
} from "@/engine/render/view/table_view_state";
import { PHONE_FAN_FIT, ROOMY_FAN_FIT } from "@/games/common/pile_layouts";
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

/** Returns a phone screen of a CSS size at a pixel ratio of 3. */
function phone(width: number, height: number, insets: Insets): Viewport {
  return { width: width * 3, height: height * 3, pixelRatio: 3, insets };
}

/** The bottom bar on an upright phone, and the rail on one on its side. */
const BAR = { ...NO_INSETS, bottom: 60 };
const RAIL = { ...NO_INSETS, left: 64 };

/** A larger screen under the header. */
const DESKTOP: Viewport = {
  width: 1280,
  height: 800,
  pixelRatio: 1,
  insets: { ...NO_INSETS, top: 64 },
};

/**
 * Phone screens from small to large, as the browser leaves them: upright with
 * the bottom bar, and on their side with the rail.
 */
const SCREENS: [name: string, viewport: Viewport][] = [
  ["360 × 640 upright", phone(360, 640, BAR)],
  ["390 × 700 upright", phone(390, 700, BAR)],
  ["430 × 800 upright", phone(430, 800, BAR)],
  ["640 × 300 on its side", phone(640, 300, RAIL)],
  ["780 × 340 on its side", phone(780, 340, RAIL)],
  ["932 × 380 on its side", phone(932, 380, RAIL)],
];

/** Auto and every arrangement a player may choose. */
const ARRANGEMENTS: [name: string, arrangement: BoardArrangement][] = [
  ["Auto", DEFAULT_BOARD_ARRANGEMENT],
  ["top, left", { piles: "top", stockSide: "left" }],
  ["top, right", { piles: "top", stockSide: "right" }],
  ["bottom, left", { piles: "bottom", stockSide: "left" }],
  ["bottom, right", { piles: "bottom", stockSide: "right" }],
];

/** Every screen under every arrangement, named for the failure message. */
const CASES = SCREENS.flatMap(([screen, viewport]) =>
  ARRANGEMENTS.map(
    ([name, arrangement]): [string, Viewport, BoardArrangement] => [
      `${screen}, ${name}`,
      viewport,
      arrangement,
    ],
  ),
);

/** How tall six hidden cards under a run from king to two stand at the floors. */
const LONGEST_COLUMN =
  CARD_HEIGHT_PX +
  6 * PHONE_FAN_FIT.minFaceDownGap +
  11 * PHONE_FAN_FIT.minFaceUpGap;

/** Returns the grid a viewport and arrangement call for. */
function gridFor(
  viewport: Viewport,
  arrangement: BoardArrangement = DEFAULT_BOARD_ARRANGEMENT,
): TableLayoutSpec {
  return chooseTableLayout(
    { roomy: KLONDIKE_LAYOUT, arranged: KLONDIKE_ARRANGED_LAYOUTS },
    formFactorOf(viewport),
    arrangement,
  );
}

/** Returns the slot a grid gives a pile. */
function slotOf(grid: TableLayoutSpec, pileId: string) {
  return grid.slots.find((slot) => slot.pileId === pileId);
}

/** Returns which half of a grid a pile sits in. */
function sideOf(grid: TableLayoutSpec, pileId: string): StockSide {
  return slotOf(grid, pileId)!.column < grid.columns / 2 ? "left" : "right";
}

const FOUNDATIONS = [
  "foundation-0",
  "foundation-1",
  "foundation-2",
  "foundation-3",
];

describe("Klondike's arranged grids", () => {
  it.each(CASES)(
    "keeps the longest column on screen at %s",
    (_name, viewport, arrangement) => {
      const metrics = measureTable(gridFor(viewport, arrangement), viewport);

      expect(metrics.rooms.get("tableau-6")).toBeGreaterThanOrEqual(
        LONGEST_COLUMN,
      );
    },
  );

  it.each(CASES)(
    "keeps the columns in order at %s",
    (_name, viewport, arrangement) => {
      const grid = gridFor(viewport, arrangement);

      const columns = [0, 1, 2, 3, 4, 5, 6].map(
        (index) => slotOf(grid, `tableau-${index}`)!.column,
      );

      expect(columns).toEqual([...columns].sort((a, b) => a - b));
    },
  );

  it.each(
    [DESKTOP, ...SCREENS.map(([, viewport]) => viewport)].flatMap((viewport) =>
      (["left", "right"] as const).map(
        (side): [string, StockSide, Viewport] => [
          `${viewport.width / viewport.pixelRatio} � ${viewport.height / viewport.pixelRatio}`,
          side,
          viewport,
        ],
      ),
    ),
  )("puts the stock where asked at %s: %s", (_name, side, viewport) => {
    const grid = gridFor(viewport, { piles: "auto", stockSide: side });

    expect(sideOf(grid, STOCK_PILE_ID)).toBe(side);
  });

  it("lays a larger screen out as it always has by default", () => {
    expect(gridFor(DESKTOP)).toBe(KLONDIKE_LAYOUT);
  });

  it("puts the stock at the bottom right of an upright phone by default", () => {
    expect(slotOf(gridFor(phone(390, 700, BAR)), STOCK_PILE_ID)).toEqual({
      pileId: STOCK_PILE_ID,
      column: 6,
      row: 0,
      anchor: "bottom",
    });
  });

  it("puts the foundations along the bottom left of an upright phone by default", () => {
    const grid = gridFor(phone(390, 700, BAR));

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
      const grid = gridFor(phone(780, 340, RAIL));

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
      expect(wasteOn(gridFor(phone(390, 700, BAR)))).toMatchObject({
        direction: "left",
      });
    });

    it("spreads away from a stock at the left, upright", () => {
      const grid = gridFor(phone(390, 700, BAR), {
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
