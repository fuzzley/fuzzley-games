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
  SPIDER_ARRANGED_LAYOUTS,
  SPIDER_LAYOUT,
} from "@/games/spider/spider_layout";
import { STOCK_PILE_ID, spiderZoneSpecs } from "@/games/spider/spider_zones";

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

/** How tall five hidden cards under fifteen face up stand at the floors. */
const LONGEST_COLUMN =
  CARD_HEIGHT_PX +
  5 * PHONE_FAN_FIT.minFaceDownGap +
  14 * PHONE_FAN_FIT.minFaceUpGap;

/** Returns the grid a viewport and arrangement call for. */
function gridFor(
  viewport: Viewport,
  arrangement: BoardArrangement = DEFAULT_BOARD_ARRANGEMENT,
): TableLayoutSpec {
  return chooseTableLayout(
    { roomy: SPIDER_LAYOUT, arranged: SPIDER_ARRANGED_LAYOUTS },
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
  it.each(CASES)(
    "keeps the longest column on screen at %s",
    (_name, viewport, arrangement) => {
      const metrics = measureTable(gridFor(viewport, arrangement), viewport);

      expect(metrics.rooms.get("tableau-9")).toBeGreaterThanOrEqual(
        LONGEST_COLUMN,
      );
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
    expect(gridFor(DESKTOP)).toBe(SPIDER_LAYOUT);
  });

  it("puts the stock at the bottom right of an upright phone by default", () => {
    expect(slotOf(gridFor(phone(390, 700, BAR)), STOCK_PILE_ID)).toEqual({
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
      gridFor(phone(390, 700, BAR), { piles: "top", stockSide: "left" }),
      gridFor(phone(390, 700, BAR)),
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
