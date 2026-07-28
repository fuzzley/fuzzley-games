import { describe, expect, it } from "vitest";
import { RenderLayer, depthFor } from "@/engine/render/layout/render_layers";

/** The layers in the order they are meant to be drawn, back to front. */
const LAYERS_BACK_TO_FRONT: readonly RenderLayer[] = [
  RenderLayer.PILE_BACKGROUND,
  RenderLayer.RESTING_CARD,
  RenderLayer.HOVER_HINT,
  RenderLayer.DROP_TARGET_HINT,
  RenderLayer.FLYING_CARD,
  RenderLayer.HELD_CARD,
];

describe("depthFor", () => {
  it("draws each layer above the one behind it", () => {
    const depths = LAYERS_BACK_TO_FRONT.map((layer) => depthFor(layer));

    expect(depths).toEqual([...depths].sort((a, b) => a - b));
  });

  it("orders things within a layer by their index", () => {
    const first = depthFor(RenderLayer.RESTING_CARD, 0);

    const second = depthFor(RenderLayer.RESTING_CARD, 1);

    expect(second).toBeGreaterThan(first);
  });

  it("keeps a whole layer below the floor of the next one", () => {
    const anyIndex = 999;

    const deepest = depthFor(RenderLayer.RESTING_CARD, anyIndex);

    expect(deepest).toBeLessThan(depthFor(RenderLayer.HOVER_HINT));
  });

  it("clamps an index past the end of the band into the layer", () => {
    const runaway = 10_000;

    const depth = depthFor(RenderLayer.RESTING_CARD, runaway);

    expect(depth).toBeLessThan(depthFor(RenderLayer.HOVER_HINT));
  });

  it("clamps a negative index to the bottom of the layer", () => {
    const depth = depthFor(RenderLayer.RESTING_CARD, -5);

    expect(depth).toBe(depthFor(RenderLayer.RESTING_CARD, 0));
  });

  it("puts a card in hand above one crossing the board", () => {
    const flying = depthFor(RenderLayer.FLYING_CARD, 999);

    const held = depthFor(RenderLayer.HELD_CARD, 0);

    expect(held).toBeGreaterThan(flying);
  });
});
