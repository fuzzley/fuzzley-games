import { describe, it, expect, vi } from "vitest";
import type { Scene } from "phaser";
import {
  TABLE_LIGHT,
  TableLight,
} from "@/engine/render/phaser/scene/table_light";
import { RenderLayer, depthFor } from "@/engine/render/view/render_layers";
import { MockGradient, createMockGradient } from "@test/support/phaser_mocks";

/** Creates a light in a stand-in scene and returns it with its gradient. */
function lightTable(): { light: TableLight; gradient: MockGradient } {
  const gradients: MockGradient[] = [];
  const scene = {
    add: {
      gradient: vi.fn((config: unknown) => {
        const gradient = createMockGradient(config);
        gradients.push(gradient);
        return gradient;
      }),
    },
  } as unknown as Pick<Scene, "add">;
  const light = new TableLight(scene);
  return { light, gradient: gradients[0] };
}

/** The colour bands a gradient was made with, as its config gave them. */
interface BandConfig {
  start: number;
  end: number;
  colorStart: number[];
  colorEnd?: number[];
}

describe("TableLight", () => {
  it("lies beneath the placeholders, so it never darkens a card", () => {
    const { gradient } = lightTable();

    expect(gradient.depth).toBe(depthFor(RenderLayer.TABLE_LIGHT));
  });

  it("centres the light above the middle of the board", () => {
    const { light, gradient } = lightTable();

    light.fit(1000, 800);

    expect([gradient.x, gradient.y]).toEqual([500, 256]);
  });

  it("stretches the gradient's circle into the board's ellipse", () => {
    // The gradient is a circle filling its quad, so the quad spans twice each
    // radius.
    const { light, gradient } = lightTable();

    light.fit(1000, 800);

    expect([gradient.width, gradient.height]).toEqual([2500, 1680]);
  });

  it("centres the gradient on the light's centre at any size", () => {
    // Phaser fixes the origin in pixels when it is set, so a resize alone
    // would leave the gradient hanging from its old corner.
    const { light, gradient } = lightTable();

    light.fit(1000, 800);

    expect([gradient.displayOriginX, gradient.displayOriginY]).toEqual([
      1250, 840,
    ]);
  });

  it("leaves the felt clear until it darkens towards the rim", () => {
    const { gradient } = lightTable();

    const { bands } = gradient.config as { bands: BandConfig[] };

    expect(bands).toEqual([
      { start: 0, end: TABLE_LIGHT.litTo, colorStart: [0, 0, 0, 0] },
      {
        start: TABLE_LIGHT.litTo,
        end: 1,
        colorStart: [0, 0, 0, 0],
        colorEnd: [0, 0, 0, TABLE_LIGHT.rimAlpha],
      },
    ]);
  });

  it("keeps the rim's darkness beyond the ellipse", () => {
    // The board's corners can lie outside the ellipse, and should not be lit.
    const { gradient } = lightTable();

    const { repeatMode } = gradient.config as { repeatMode: number };

    expect(repeatMode).toBe(0);
  });

  it("removes the gradient when destroyed", () => {
    const { light, gradient } = lightTable();

    light.destroy();

    expect(gradient.destroyed).toBe(true);
  });
});
