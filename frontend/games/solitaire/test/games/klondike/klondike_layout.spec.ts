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
  KLONDIKE_LAYOUT,
  KLONDIKE_PHONE_LAYOUTS,
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

/** How tall six hidden cards under a run from king to two stand at the floors. */
const LONGEST_COLUMN =
  CARD_HEIGHT_PX +
  6 * PHONE_FAN_FIT.minFaceDownGap +
  11 * PHONE_FAN_FIT.minFaceUpGap;

/** Returns the grid a viewport and arrangement call for. */
function gridFor(
  viewport: Viewport,
  arrangement: BoardArrangement,
): TableLayoutSpec {
  return chooseTableLayout(
    { roomy: KLONDIKE_LAYOUT, phone: KLONDIKE_PHONE_LAYOUTS },
    formFactorOf(viewport),
    arrangement,
  );
}

/** Returns the slot a grid gives a pile. */
function slotOf(grid: TableLayoutSpec, pileId: string) {
  return grid.slots.find((slot) => slot.pileId === pileId);
}

describe("Klondike's phone grids", () => {
  it.each(CASES)(
    "keeps the longest column on screen at %s",
    (_name, viewport, arrangement) => {
      const metrics = measureTable(gridFor(viewport, arrangement), viewport);

      expect(metrics.rooms.get("tableau-6")).toBeGreaterThanOrEqual(
        LONGEST_COLUMN,
      );
    },
  );

  it.each(SCREENS)(
    "keeps the columns in order for a left hand at %s",
    (_name, viewport) => {
      const grid = gridFor(viewport, {
        ...DEFAULT_BOARD_ARRANGEMENT,
        hand: "left",
      });

      const columns = [0, 1, 2, 3, 4, 5, 6].map(
        (index) => slotOf(grid, `tableau-${index}`)!.column,
      );

      expect(columns).toEqual([...columns].sort((a, b) => a - b));
    },
  );

  it("puts the stock at the bottom left of an upright phone for a left hand", () => {
    const grid = gridFor(phone(390, 700, BAR), {
      ...DEFAULT_BOARD_ARRANGEMENT,
      hand: "left",
    });

    expect(slotOf(grid, STOCK_PILE_ID)?.column).toBe(0);
  });

  it("puts the stock at the bottom right of an upright phone", () => {
    expect(
      slotOf(KLONDIKE_PHONE_LAYOUTS.portrait.bottom, STOCK_PILE_ID),
    ).toEqual({ pileId: STOCK_PILE_ID, column: 6, row: 0, anchor: "bottom" });
  });

  it("puts the foundations along the bottom left of an upright phone", () => {
    const columns = [
      "foundation-0",
      "foundation-1",
      "foundation-2",
      "foundation-3",
    ]
      .map(
        (pileId) =>
          slotOf(KLONDIKE_PHONE_LAYOUTS.portrait.bottom, pileId)?.column,
      )
      .sort();

    expect(columns).toEqual([0, 1, 2, 3]);
  });

  it("stacks the foundations down the left rail on its side", () => {
    const columns = new Set(
      ["foundation-0", "foundation-1", "foundation-2", "foundation-3"].map(
        (pileId) => slotOf(KLONDIKE_PHONE_LAYOUTS.landscape, pileId)?.column,
      ),
    );

    expect([...columns]).toEqual([0]);
  });

  it("tops the right rail with the stock on its side", () => {
    expect(
      slotOf(KLONDIKE_PHONE_LAYOUTS.landscape, STOCK_PILE_ID),
    ).toMatchObject({ column: 8, offset: { x: 0, y: 0 } });
  });

  it("marks each foundation at its top edge down the rail, the last one closed", () => {
    const artwork = [
      "foundation-0",
      "foundation-1",
      "foundation-2",
      "foundation-3",
    ].map((pileId) =>
      KLONDIKE_PHONE_LAYOUTS.landscape.pileBackgrounds?.[pileId]?.(
        FOUNDATION_PLACEHOLDER,
      ),
    );

    expect(artwork).toEqual([
      COVERED_FOUNDATION_PLACEHOLDER,
      COVERED_FOUNDATION_PLACEHOLDER,
      COVERED_FOUNDATION_PLACEHOLDER,
      RAIL_FOUNDATION_PLACEHOLDER,
    ]);
  });

  describe.each([1, 3] as const)("the waste of a draw %i", (drawCount) => {
    const own = klondikeZoneSpecs(drawCount).find(
      (zone) => zone.id === WASTE_PILE_ID,
    )!.layout;

    /** Returns how the waste arranges its cards on a grid. */
    function wasteOn(grid: TableLayoutSpec) {
      return grid.pileLayouts?.[WASTE_PILE_ID]?.(own) ?? own;
    }

    it("spreads towards the stock beside it, upright", () => {
      expect(wasteOn(KLONDIKE_PHONE_LAYOUTS.portrait.bottom)).toMatchObject({
        direction: "left",
      });
    });

    it("spreads down under the stock, on its side", () => {
      expect(wasteOn(KLONDIKE_PHONE_LAYOUTS.landscape)).toMatchObject({
        direction: "down",
      });
    });

    it("keeps the draw's count of spread cards on every grid", () => {
      const grids = [
        KLONDIKE_PHONE_LAYOUTS.portrait.bottom,
        KLONDIKE_PHONE_LAYOUTS.portrait.top,
        KLONDIKE_PHONE_LAYOUTS.landscape,
      ];

      const shown = grids.map((grid) => {
        const waste = wasteOn(grid);
        return waste.kind === "spread" ? waste.maxVisible : null;
      });

      expect(shown).toEqual(Array(3).fill(drawCount === 1 ? 1 : 3));
    });
  });
});
