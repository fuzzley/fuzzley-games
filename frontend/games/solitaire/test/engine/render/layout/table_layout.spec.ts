import { describe, it, expect } from "vitest";
import {
  TableLayoutSpec,
  computePileOrigins,
  computeScale,
  designSize,
} from "@/engine/render/layout/table_layout";
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
