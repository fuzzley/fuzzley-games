import { describe, it, expect } from "vitest";
import { resolveDropTarget } from "@/game/render/scene/board/input/drop_target_resolver";
import {
  PileGeometry,
  Rect,
} from "@/game/render/scene/board/view/board_view_state";

describe("drop_target_resolver", () => {
  const geometries: PileGeometry[] = [
    { pileId: "tableau-0", x: 100, y: 300, width: 200, height: 300 },
    { pileId: "tableau-1", x: 400, y: 300, width: 200, height: 300 },
    { pileId: "foundation-0", x: 400, y: 50, width: 200, height: 300 },
  ];

  it("returns the pile ID with the maximum overlap area", () => {
    // Overlaps tableau-0 partially
    const dragRect: Rect = { x: 150, y: 350, width: 200, height: 300 };
    const target = resolveDropTarget(dragRect, geometries);
    expect(target).toBe("tableau-0");
  });

  it("returns null if there is no overlap at all", () => {
    const dragRect: Rect = { x: 800, y: 800, width: 200, height: 300 };
    const target = resolveDropTarget(dragRect, geometries);
    expect(target).toBeNull();
  });

  it("resolves overlap correctly when overlapping multiple piles", () => {
    // Positioned right between tableau-0 and tableau-1 but mostly on tableau-1
    const dragRect: Rect = { x: 350, y: 300, width: 200, height: 300 };
    const target = resolveDropTarget(dragRect, geometries);
    expect(target).toBe("tableau-1");
  });
});
