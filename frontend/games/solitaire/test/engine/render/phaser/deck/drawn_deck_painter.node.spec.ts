import { describe, it, expect } from "vitest";
import { createBrowserCanvas } from "@/engine/render/phaser/deck/drawn_deck_painter";

// In Node, which has no document, unlike the painter's own spec.
describe("createBrowserCanvas outside a browser", () => {
  it("makes no canvas", () => {
    expect(createBrowserCanvas(100, 100)).toBeNull();
  });
});
