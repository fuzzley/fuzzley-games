import { describe, it, expect } from "vitest";
import {
  TableLayoutSpec,
  designSize,
} from "@/engine/render/layout/table_layout";

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
