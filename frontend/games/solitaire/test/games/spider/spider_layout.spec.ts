import { describe, it, expect } from "vitest";
import {
  BoardArrangement,
  DEFAULT_BOARD_ARRANGEMENT,
  chooseTableLayout,
} from "@/engine/render/layout/board_layouts";
import { CARD_HEIGHT_PX } from "@/engine/render/layout/card_metrics";
import { formFactorOf } from "@/engine/render/layout/form_factor";
import {
  TableLayoutSpec,
  measureTable,
} from "@/engine/render/layout/table_layout";
import {
  Insets,
  NO_INSETS,
  Viewport,
} from "@/engine/render/view/table_view_state";
import { PHONE_FAN_FIT } from "@/games/common/pile_layouts";
import {
  COVERED_FOUNDATION_PLACEHOLDER,
  FOUNDATION_PLACEHOLDER,
  RAIL_FOUNDATION_PLACEHOLDER,
} from "@/games/common/zone_presets";
import {
  SPIDER_LAYOUT,
  SPIDER_PHONE_LAYOUTS,
} from "@/games/spider/spider_layout";
import { STOCK_PILE_ID, spiderZoneSpecs } from "@/games/spider/spider_zones";

/** Returns a phone screen of a CSS size at a pixel ratio of 3. */
function phone(width: number, height: number, insets: Insets): Viewport {
  return { width: width * 3, height: height * 3, pixelRatio: 3, insets };
}

/** The bottom bar on an upright phone, and the rail on one on its side. */
const BAR = { ...NO_INSETS, bottom: 60 };
const RAIL = { ...NO_INSETS, left: 64 };

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

const ARRANGEMENTS: [name: string, arrangement: BoardArrangement][] = [
  ["piles below", DEFAULT_BOARD_ARRANGEMENT],
  ["piles above", { ...DEFAULT_BOARD_ARRANGEMENT, phonePiles: "top" }],
  ["mirrored", { ...DEFAULT_BOARD_ARRANGEMENT, hand: "left" }],
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
  arrangement: BoardArrangement,
): TableLayoutSpec {
  return chooseTableLayout(
    { roomy: SPIDER_LAYOUT, phone: SPIDER_PHONE_LAYOUTS },
    formFactorOf(viewport),
    arrangement,
  );
}

/** Returns the slot a grid gives a pile. */
function slotOf(grid: TableLayoutSpec, pileId: string) {
  return grid.slots.find((slot) => slot.pileId === pileId);
}

/** The stock's own arrangement, before any grid changes it. */
const OWN_STOCK = spiderZoneSpecs().find(
  (zone) => zone.id === STOCK_PILE_ID,
)!.layout;

/** Returns how the stock arranges its cards on a grid. */
function stockOn(grid: TableLayoutSpec) {
  return grid.pileLayouts?.[STOCK_PILE_ID]?.(OWN_STOCK) ?? OWN_STOCK;
}

describe("Spider's phone grids", () => {
  it.each(CASES)(
    "keeps the longest column on screen at %s",
    (_name, viewport, arrangement) => {
      const metrics = measureTable(gridFor(viewport, arrangement), viewport);

      expect(metrics.rooms.get("tableau-9")).toBeGreaterThanOrEqual(
        LONGEST_COLUMN,
      );
    },
  );

  it("puts the stock at the bottom right of an upright phone", () => {
    expect(slotOf(SPIDER_PHONE_LAYOUTS.portrait.bottom, STOCK_PILE_ID)).toEqual(
      { pileId: STOCK_PILE_ID, column: 9, row: 0, anchor: "bottom" },
    );
  });

  it("tops the right rail with the stock on its side", () => {
    expect(slotOf(SPIDER_PHONE_LAYOUTS.landscape, STOCK_PILE_ID)).toMatchObject(
      { column: 10, offset: { x: 0, y: 0 } },
    );
  });

  it("stacks the foundations down the same rail, below the stock", () => {
    const foundations = SPIDER_PHONE_LAYOUTS.landscape.slots.filter((slot) =>
      slot.pileId.startsWith("foundation"),
    );

    expect(
      foundations.every(
        (slot) => slot.column === 10 && (slot.offset?.y ?? 0) > 0,
      ),
    ).toBe(true);
  });

  it("marks each foundation at its top edge down the rail, the last one closed", () => {
    const artwork = Array.from({ length: 8 }, (_, index) =>
      SPIDER_PHONE_LAYOUTS.landscape.pileBackgrounds?.[`foundation-${index}`]?.(
        FOUNDATION_PLACEHOLDER,
      ),
    );

    expect(artwork).toEqual([
      ...Array<string>(7).fill(COVERED_FOUNDATION_PLACEHOLDER),
      RAIL_FOUNDATION_PLACEHOLDER,
    ]);
  });

  it("shows the stock as one sliver for each deal on every grid", () => {
    const grids = [
      SPIDER_PHONE_LAYOUTS.portrait.top,
      SPIDER_PHONE_LAYOUTS.portrait.bottom,
      SPIDER_PHONE_LAYOUTS.landscape,
    ];

    expect(grids.map((grid) => stockOn(grid))).toEqual([
      expect.objectContaining({ direction: "right", groupSize: 10 }),
      expect.objectContaining({ direction: "left", groupSize: 10 }),
      expect.objectContaining({ direction: "down", groupSize: 10 }),
    ]);
  });

  it("leaves the stock stacked on a larger screen", () => {
    expect(SPIDER_LAYOUT.pileLayouts).toBeUndefined();
  });
});
