import { describe, it, expect } from "vitest";
import {
  TableLayoutSpec,
  designSize,
} from "@/engine/render/layout/table_layout";
import {
  compactFor,
  computePileOrigins,
  computePileRooms,
  computeScale,
  measureTable,
} from "@/engine/render/layout/table_metrics";
import { COMPACT_MAX_WIDTH_CSS_PX } from "@/engine/render/layout/form_factor";
import { NO_INSETS, Viewport } from "@/engine/render/layout/viewport";
import { FAKE_TABLE_LAYOUT } from "@test/support/fake_table/board";
import {
  STOCK_PILE_ID,
  TABLEAU_COUNT,
  WASTE_PILE_ID,
  foundationPileId,
  tableauPileId,
} from "@test/support/fake_table/zones";
import {
  CARD_HEIGHT_PX,
  CARD_WIDTH_PX,
  LAYOUT_GAP_X,
  LAYOUT_PADDING_X,
  LAYOUT_PADDING_Y,
} from "@/engine/render/layout/card_metrics";

/** Returns an unremarkable board with the given overrides. */
function layout(overrides: Partial<TableLayoutSpec> = {}): TableLayoutSpec {
  return {
    columns: 4,
    rows: 2,
    slots: [
      { pileId: "a", column: 0, row: 0 },
      { pileId: "b", column: 3, row: 1 },
    ],
    cardSize: { width: 100, height: 150 },
    gap: { x: 10, y: 20 },
    padding: { x: 5, y: 5 },
    ...overrides,
  };
}

const DESIGN_WIDTH_PX = designSize(FAKE_TABLE_LAYOUT).width;

const DESIGN_HEIGHT_PX = designSize(FAKE_TABLE_LAYOUT).height;

/** A header laid over the top of the canvas, in CSS pixels, as the shell's is. */
const INSET_TOP = 73;

/**
 * Returns a viewport at the design size below a header, which lays out at a
 * scale of 1.
 */
function designViewport(overrides: Partial<Viewport> = {}): Viewport {
  return {
    width: DESIGN_WIDTH_PX,
    height: DESIGN_HEIGHT_PX + INSET_TOP,
    pixelRatio: 1,
    insets: { ...NO_INSETS, top: INSET_TOP },
    ...overrides,
  };
}

describe("computeScale", () => {
  it("is 1 when the viewport is exactly the design size", () => {
    const spec = layout();
    const design = designSize(spec);
    const viewport: Viewport = { ...design, pixelRatio: 1 };

    expect(computeScale(spec, viewport)).toBe(1);
  });

  it("fits the board below the viewport's top inset", () => {
    const spec = layout();
    const design = designSize(spec);
    const viewport: Viewport = {
      width: design.width,
      height: design.height + 30,
      pixelRatio: 1,
      insets: { ...NO_INSETS, top: 30 },
    };

    expect(computeScale(spec, viewport)).toBe(1);
  });

  it("fits the board inside insets on every side", () => {
    const spec = layout();
    const design = designSize(spec);
    const viewport: Viewport = {
      width: design.width + 40 + 60,
      height: design.height + 30 + 20,
      pixelRatio: 1,
      insets: { top: 30, right: 60, bottom: 20, left: 40 },
    };

    expect(computeScale(spec, viewport)).toBe(1);
  });

  it("shrinks the board when a side inset takes some of its width", () => {
    const spec = layout();
    const design = designSize(spec);
    const viewport: Viewport = {
      width: design.width,
      height: design.height,
      pixelRatio: 1,
      insets: { ...NO_INSETS, left: design.width / 2 },
    };

    expect(computeScale(spec, viewport)).toBe(0.5);
  });

  it("measures the inset in CSS pixels, converting it by the pixel ratio", () => {
    const spec = layout();
    const design = designSize(spec);
    const viewport: Viewport = {
      width: design.width * 2,
      height: (design.height + 30) * 2,
      pixelRatio: 2,
      insets: { ...NO_INSETS, top: 30 },
    };

    expect(computeScale(spec, viewport)).toBe(2);
  });

  it("shrinks a wider board to fit the same viewport", () => {
    const design = designSize(layout({ columns: 4 }));
    const viewport: Viewport = { ...design, pixelRatio: 1 };

    const wider = computeScale(layout({ columns: 8 }), viewport);

    expect(wider).toBeLessThan(1);
  });
});

describe("computePileOrigins", () => {
  it("places only the piles the layout gives a slot", () => {
    const origins = computePileOrigins(layout(), designViewport(), 1);

    expect([...origins.keys()].sort()).toEqual(["a", "b"]);
  });

  it("steps a column across by a card and a gap", () => {
    const origins = computePileOrigins(layout(), designViewport(), 1);

    expect(origins.get("b")!.x - origins.get("a")!.x).toBe(3 * 110);
  });

  it("steps a row down by a card and a gap", () => {
    const origins = computePileOrigins(layout(), designViewport(), 1);

    expect(origins.get("b")!.y - origins.get("a")!.y).toBe(170);
  });

  it("starts the board at the top of a viewport with no inset", () => {
    const origins = computePileOrigins(layout(), designViewport(), 1);

    expect(origins.get("a")!.y).toBe(layout().padding.y);
  });

  it("starts the board below the inset, which the pixel ratio scales", () => {
    const viewport: Viewport = {
      ...designViewport(),
      insets: { ...NO_INSETS, top: 30 },
    };

    const origins = computePileOrigins(
      layout(),
      { ...viewport, pixelRatio: 2 },
      1,
    );

    // The inset is the shell's, in CSS pixels; the padding is the board's.
    expect(origins.get("a")!.y).toBe(30 * 2 + layout().padding.y);
  });

  it("starts the board right of a left inset", () => {
    const design = designSize(layout());
    const viewport: Viewport = {
      width: design.width + 50,
      height: design.height,
      pixelRatio: 1,
      insets: { ...NO_INSETS, left: 50 },
    };

    const origins = computePileOrigins(layout(), viewport, 1);

    expect(origins.get("a")!.x).toBe(50 + layout().padding.x);
  });

  it("centres a narrow board in the width the side insets leave", () => {
    const design = designSize(layout());
    const viewport: Viewport = {
      width: design.width + 100 + 20,
      height: design.height,
      pixelRatio: 1,
      insets: { ...NO_INSETS, left: 100 },
    };

    const origins = computePileOrigins(layout(), viewport, 1);

    // Twenty spare pixels beside the inset, split either side of the board.
    expect(origins.get("a")!.x).toBe(100 + layout().padding.x + 10);
  });

  it("keeps an eight-column board inside a viewport sized for it", () => {
    // The FreeCell shape: eight columns.
    const spec = layout({
      columns: 8,
      slots: [{ pileId: "last", column: 7, row: 0 }],
    });
    const design = designSize(spec);
    const viewport: Viewport = { ...design, pixelRatio: 1 };

    const origin = computePileOrigins(spec, viewport, 1).get("last")!;

    expect(origin.x + spec.cardSize.width).toBeLessThanOrEqual(design.width);
  });

  function designViewport(): Viewport {
    return { ...designSize(layout()), pixelRatio: 1 };
  }
});

describe("computePileOrigins with anchored and offset slots", () => {
  /** A viewport the width of the board and 100 pixels taller. */
  function tall(overrides: Partial<Viewport> = {}): Viewport {
    const design = designSize(layout());
    return {
      width: design.width,
      height: design.height + 100,
      pixelRatio: 1,
      ...overrides,
    };
  }

  it("puts row 0 of a bottom-anchored slot on the board's bottom edge", () => {
    const spec = layout({
      slots: [{ pileId: "floor", column: 0, row: 0, anchor: "bottom" }],
    });
    const viewport = tall();

    const origin = computePileOrigins(spec, viewport, 1).get("floor")!;

    expect(origin.y).toBe(viewport.height - spec.padding.y - 150);
  });

  it("counts a bottom-anchored row up from the bottom edge", () => {
    const spec = layout({
      slots: [{ pileId: "above", column: 0, row: 1, anchor: "bottom" }],
    });
    const viewport = tall();

    const origin = computePileOrigins(spec, viewport, 1).get("above")!;

    // One card and one gap above the floor row.
    expect(origin.y).toBe(viewport.height - spec.padding.y - 150 - 170);
  });

  it("keeps a bottom-anchored slot above the bottom inset", () => {
    const spec = layout({
      slots: [{ pileId: "floor", column: 0, row: 0, anchor: "bottom" }],
    });
    const viewport = tall({ insets: { ...NO_INSETS, bottom: 40 } });

    const origin = computePileOrigins(spec, viewport, 1).get("floor")!;

    expect(origin.y).toBe(viewport.height - 40 - spec.padding.y - 150);
  });

  it("moves an offset slot by its offset, at the layout scale", () => {
    const spec = layout({
      slots: [
        { pileId: "cell", column: 1, row: 0 },
        { pileId: "nudged", column: 1, row: 0, offset: { x: 30, y: 60 } },
      ],
    });

    const origins = computePileOrigins(spec, tall({ pixelRatio: 2 }), 2);

    const cell = origins.get("cell")!;
    const nudged = origins.get("nudged")!;
    expect([nudged.x - cell.x, nudged.y - cell.y]).toEqual([60, 120]);
  });
});

describe("computePileRooms", () => {
  /** Measures the room below every pile of `spec` on a viewport its own size. */
  function rooms(spec: TableLayoutSpec, extraHeight = 0) {
    const design = designSize(spec);
    const viewport: Viewport = {
      width: design.width,
      height: design.height + extraHeight,
      pixelRatio: 1,
    };
    return computePileRooms(
      spec,
      viewport,
      1,
      computePileOrigins(spec, viewport, 1),
    );
  }

  it("gives a pile with nothing below it the rest of the board", () => {
    const spec = layout({ slots: [{ pileId: "top", column: 0, row: 0 }] });

    // The board is 330 tall; the pile starts 5 down and stops 5 short.
    expect(rooms(spec).get("top")).toBe(320);
  });

  it("stops a pile a gap above the pile below it in its column", () => {
    const spec = layout({
      slots: [
        { pileId: "top", column: 0, row: 0 },
        { pileId: "under", column: 0, row: 1 },
      ],
    });

    // The next row starts a card and a gap below; the pile stops a gap short.
    expect(rooms(spec).get("top")).toBe(150);
  });

  it("ignores a pile below it in another column", () => {
    const spec = layout({
      slots: [
        { pileId: "top", column: 0, row: 0 },
        { pileId: "aside", column: 1, row: 1 },
      ],
    });

    expect(rooms(spec).get("top")).toBe(320);
  });

  it("stops every pile above a bottom-anchored row, whatever its column", () => {
    const spec = layout({
      slots: [
        { pileId: "top", column: 0, row: 0 },
        { pileId: "floor", column: 3, row: 0, anchor: "bottom" },
      ],
    });

    // The floor row starts 150 + 5 above the bottom of a 430 tall board; the
    // pile above stops a gap short of it.
    expect(rooms(spec, 100).get("top")).toBe(430 - 5 - 150 - 20 - 5);
  });

  it("ignores a bottom-anchored pile in its own row in another column", () => {
    const spec = layout({
      rows: 1,
      slots: [
        { pileId: "column", column: 0, row: 0 },
        { pileId: "rail", column: 3, row: 0, anchor: "bottom" },
      ],
    });

    // The board is 160 tall plus 100; the column runs to its bottom padding.
    expect(rooms(spec, 100).get("column")).toBe(260 - 5 - 5);
  });

  it("stops a pile a gap above the next pile down a bottom-anchored rail", () => {
    const spec = layout({
      rows: 1,
      slots: [
        {
          pileId: "stock",
          column: 3,
          row: 0,
          anchor: "bottom",
          offset: { x: 0, y: -170 },
        },
        { pileId: "waste", column: 3, row: 0, anchor: "bottom" },
      ],
    });

    // The stock starts 170 above the waste and stops a gap short of it.
    expect(rooms(spec, 300).get("stock")).toBe(170 - 20);
  });

  it("measures the room in design units, whatever the scale", () => {
    const spec = layout({ slots: [{ pileId: "top", column: 0, row: 0 }] });
    const design = designSize(spec);
    const viewport: Viewport = {
      width: design.width * 2,
      height: design.height * 2,
      pixelRatio: 2,
    };

    const measured = computePileRooms(
      spec,
      viewport,
      2,
      computePileOrigins(spec, viewport, 2),
    );

    expect(measured.get("top")).toBe(320);
  });
});

describe("measureTable", () => {
  it("measures the room below every pile it places", () => {
    const spec = layout();
    const design = designSize(spec);

    const metrics = measureTable(spec, { ...design, pixelRatio: 1 });

    expect([...metrics.rooms.keys()].sort()).toEqual(["a", "b"]);
  });
});

describe("compactFor", () => {
  const wide: Viewport = { width: 1600, height: 900, pixelRatio: 1 };
  const phone: Viewport = { width: 780, height: 1688, pixelRatio: 2 };

  it("leaves a board alone when there is room", () => {
    expect(compactFor(layout(), wide).gap).toEqual(layout().gap);
  });

  it("tightens the gaps on a small screen", () => {
    expect(compactFor(layout(), phone).gap.x).toBeLessThan(layout().gap.x);
  });

  it("tightens the padding too", () => {
    const roomy = layout({ padding: { x: 40, y: 40 } });

    expect(compactFor(roomy, phone).padding.x).toBeLessThan(roomy.padding.x);
  });

  it("never loosens a board already drawn closer together than that", () => {
    const tight = layout({ gap: { x: 2, y: 2 }, padding: { x: 2, y: 2 } });

    const compact = compactFor(tight, phone);

    expect([compact.gap.x, compact.padding.x]).toEqual([2, 2]);
  });

  it("leaves a board alone at the breakpoint itself, as the stylesheets do", () => {
    const atBreakpoint: Viewport = {
      width: COMPACT_MAX_WIDTH_CSS_PX,
      height: 900,
      pixelRatio: 1,
    };

    expect(compactFor(layout(), atBreakpoint).gap).toEqual(layout().gap);
  });

  it("tightens a phone on its side, though it is wider than the breakpoint", () => {
    const sideways: Viewport = {
      width: 844 * 3,
      height: 390 * 3,
      pixelRatio: 3,
    };

    expect(compactFor(layout(), sideways).gap.x).toBeLessThan(layout().gap.x);
  });

  it("judges width in CSS pixels, not device pixels", () => {
    // 780 device pixels at 2x is a 390px phone, not a 780px tablet.
    expect(compactFor(layout(), phone).gap.x).toBeLessThan(layout().gap.x);
  });

  it("keeps the columns, rows and slots exactly as they were", () => {
    const compact = compactFor(layout({ columns: 10 }), phone);

    expect([compact.columns, compact.rows, compact.slots.length]).toEqual([
      10, 2, 2,
    ]);
  });

  it("leaves an unmeasured viewport alone", () => {
    const compact = compactFor(layout(), {
      width: 0,
      height: 0,
      pixelRatio: 1,
    });

    expect(compact.gap).toEqual(layout().gap);
  });

  it("buys card size, which is the point", () => {
    const spec = layout({ columns: 10 });

    const roomy = measureTable(spec, wide).scale;
    const tight = measureTable(spec, phone).scale;

    // Same board, narrower screen: the compact gaps mean the scale does not
    // fall as far as the raw width ratio would suggest.
    expect(tight * (1600 / 780)).toBeGreaterThan(roomy);
  });
});

describe("computeScale on the fake table's board", () => {
  it("is 1 at the design size on a 1x display", () => {
    expect(computeScale(FAKE_TABLE_LAYOUT, designViewport())).toBe(1);
  });

  it("halves when the viewport is half the design width", () => {
    const viewport = designViewport({ width: DESIGN_WIDTH_PX / 2 });

    expect(computeScale(FAKE_TABLE_LAYOUT, viewport)).toBeCloseTo(0.5, 5);
  });

  it("fits to whichever axis is tighter", () => {
    // Plenty of width, but only half the height the design needs.
    const viewport = designViewport({
      width: DESIGN_WIDTH_PX * 4,
      height: DESIGN_HEIGHT_PX / 2 + INSET_TOP,
    });

    expect(computeScale(FAKE_TABLE_LAYOUT, viewport)).toBeCloseTo(0.5, 5);
  });

  it("scales up to the pixel ratio on a high density display", () => {
    const viewport: Viewport = {
      width: DESIGN_WIDTH_PX * 2,
      height: DESIGN_HEIGHT_PX * 2,
      pixelRatio: 2,
    };

    // A design unit is worth two device pixels there, and rendering it as one
    // would throw away half the display's resolution.
    expect(computeScale(FAKE_TABLE_LAYOUT, viewport)).toBe(2);
  });

  it("caps at the pixel ratio however much room there is", () => {
    const viewport: Viewport = {
      width: DESIGN_WIDTH_PX * 10,
      height: DESIGN_HEIGHT_PX * 10,
      pixelRatio: 2,
    };

    expect(computeScale(FAKE_TABLE_LAYOUT, viewport)).toBe(2);
  });

  it("falls back to the pixel ratio for a zero-sized viewport", () => {
    const viewport: Viewport = { width: 0, height: 0, pixelRatio: 2 };

    expect(computeScale(FAKE_TABLE_LAYOUT, viewport)).toBe(2);
  });
});

describe("computePileOrigins on the fake table's board", () => {
  it("places every pile the board draws", () => {
    const origins = computePileOrigins(FAKE_TABLE_LAYOUT, designViewport(), 1);

    const expectedIds = [
      STOCK_PILE_ID,
      WASTE_PILE_ID,
      ...[0, 1, 2, 3].map(foundationPileId),
      ...[0, 1, 2, 3, 4, 5, 6].map(tableauPileId),
    ];
    expect([...origins.keys()].sort()).toEqual(expectedIds.sort());
  });

  it("starts the top row below the header", () => {
    const origins = computePileOrigins(FAKE_TABLE_LAYOUT, designViewport(), 1);

    expect(origins.get(STOCK_PILE_ID)!.y).toBe(INSET_TOP + LAYOUT_PADDING_Y);
  });

  it("puts the tableau row a card and a gap below the top row", () => {
    const origins = computePileOrigins(FAKE_TABLE_LAYOUT, designViewport(), 1);

    const topY = origins.get(STOCK_PILE_ID)!.y;
    const bottomY = origins.get(tableauPileId(0))!.y;
    expect(bottomY).toBeGreaterThan(topY + CARD_HEIGHT_PX);
  });

  it("lines each tableau up with its column", () => {
    const origins = computePileOrigins(FAKE_TABLE_LAYOUT, designViewport(), 1);

    const columnWidth = CARD_WIDTH_PX + LAYOUT_GAP_X;
    const firstX = origins.get(tableauPileId(0))!.x;
    expect(origins.get(tableauPileId(3))!.x).toBeCloseTo(
      firstX + 3 * columnWidth,
      5,
    );
  });

  it("leaves a clear column between the waste and the first foundation", () => {
    const origins = computePileOrigins(FAKE_TABLE_LAYOUT, designViewport(), 1);

    // Waste sits in column 1 and foundations start at column 3, so the fan has
    // the whole of column 2 to grow into.
    const columnWidth = CARD_WIDTH_PX + LAYOUT_GAP_X;
    const gap =
      origins.get(foundationPileId(0))!.x - origins.get(WASTE_PILE_ID)!.x;
    expect(gap).toBeCloseTo(2 * columnWidth, 5);
  });

  it("centers the layout when the viewport is wider than it needs", () => {
    const wide = designViewport({ width: DESIGN_WIDTH_PX * 2 });

    const origins = computePileOrigins(FAKE_TABLE_LAYOUT, wide, 1);

    const layoutWidth =
      TABLEAU_COUNT * CARD_WIDTH_PX + (TABLEAU_COUNT - 1) * LAYOUT_GAP_X;
    const expectedPadding = (wide.width - layoutWidth) / 2;
    expect(origins.get(tableauPileId(0))!.x).toBeCloseTo(expectedPadding, 5);
  });

  it("never squeezes tighter than the layout padding", () => {
    const narrow = designViewport({ width: 100 });

    const origins = computePileOrigins(FAKE_TABLE_LAYOUT, narrow, 1);

    expect(origins.get(tableauPileId(0))!.x).toBe(LAYOUT_PADDING_X);
  });

  it("converts the header by the pixel ratio, not the layout scale", () => {
    // The header is a DOM overlay measured in CSS pixels.
    const origins = computePileOrigins(
      FAKE_TABLE_LAYOUT,
      {
        width: DESIGN_WIDTH_PX * 2,
        height: (DESIGN_HEIGHT_PX + INSET_TOP) * 2,
        pixelRatio: 2,
        insets: { ...NO_INSETS, top: INSET_TOP },
      },
      2,
    );

    expect(origins.get(STOCK_PILE_ID)!.y).toBe(
      INSET_TOP * 2 + LAYOUT_PADDING_Y * 2,
    );
  });
});
