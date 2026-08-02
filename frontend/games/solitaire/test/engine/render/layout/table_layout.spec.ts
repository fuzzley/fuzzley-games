import { describe, it, expect } from "vitest";
import {
  TableLayoutSpec,
  compactFor,
  computePileOrigins,
  computeScale,
  designSize,
  measureTable,
} from "@/engine/render/layout/table_layout";
import {
  HEADER_HEIGHT_COMPACT_PX,
  HEADER_HEIGHT_PX,
} from "@/engine/render/layout/card_metrics";
import { Viewport } from "@/engine/render/view/table_view_state";

/**
 * A board with the given column count and nothing else remarkable, so a test
 * can vary one dimension and read the consequence.
 */
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
    headerHeightPx: 30,
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

  it("spans the header, the rows, the gaps and the padding", () => {
    const size = designSize(layout());

    // 30 + 2 * 150 + 1 * 20 + 2 * 5
    expect(size.height).toBe(360);
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

  it("keeps an eight-column board inside a viewport sized for it", () => {
    // The FreeCell shape: eight columns, and nothing in the engine restated.
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

  it("reserves the compacted header the shell actually draws", () => {
    const desktopHeader = layout({ headerHeightPx: HEADER_HEIGHT_PX });

    const compact = compactFor(desktopHeader, phone);

    expect(compact.headerHeightPx).toBe(HEADER_HEIGHT_COMPACT_PX);
  });

  it("leaves the header alone when there is room for the full one", () => {
    const desktopHeader = layout({ headerHeightPx: HEADER_HEIGHT_PX });

    expect(compactFor(desktopHeader, wide).headerHeightPx).toBe(
      HEADER_HEIGHT_PX,
    );
  });

  it("never grows a header already shorter than the compact one", () => {
    const shallow = layout({ headerHeightPx: 30 });

    expect(compactFor(shallow, phone).headerHeightPx).toBe(30);
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
