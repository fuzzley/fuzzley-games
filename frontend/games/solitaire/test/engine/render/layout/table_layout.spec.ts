import { describe, it, expect } from "vitest";
import {
  TableLayoutSpec,
  compactFor,
  computePileOrigins,
  computePileRooms,
  computeScale,
  designSize,
  measureTable,
} from "@/engine/render/layout/table_layout";
import { COMPACT_MAX_WIDTH_CSS_PX } from "@/engine/render/layout/form_factor";
import { NO_INSETS, Viewport } from "@/engine/render/view/table_view_state";

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

describe("designSize", () => {
  it("spans the columns, the gaps between them, and the padding either side", () => {
    const size = designSize(layout());

    // 4 * 100 + 3 * 10 + 2 * 5
    expect(size.width).toBe(440);
  });

  it("grows by exactly one column and one gap when a column is added", () => {
    const before = designSize(layout({ columns: 4 })).width;

    const after = designSize(layout({ columns: 5 })).width;

    expect(after - before).toBe(110);
  });

  it("spans the rows, the gaps and the padding", () => {
    const size = designSize(layout());

    // 2 * 150 + 1 * 20 + 2 * 5
    expect(size.height).toBe(330);
  });

  it("takes a declared design height over the one its grid needs", () => {
    const size = designSize(layout({ designHeightPx: 500 }));

    expect(size.height).toBe(500);
  });

  it("charges no gap for a single column", () => {
    const size = designSize(layout({ columns: 1 }));

    // 1 * 100 + 0 gaps + 2 * 5
    expect(size.width).toBe(110);
  });
});

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
