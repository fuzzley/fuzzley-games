// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { type Display, GameObjects } from "phaser";
import type { HostedScene } from "@fz/phaser/host";
import { type SceneRun, runBareScene } from "@fz/phaser/testing";
import {
  TABLE_LIGHT,
  TableLight,
} from "@/engine/render/phaser/scene/table_light";
import { RenderLayer, depthFor } from "@/engine/render/view/render_layers";

/** The scene each spec lights, destroyed after it. */
let run: SceneRun<HostedScene> | undefined;

afterEach(() => {
  run?.destroy();
  run = undefined;
});

/** Creates a light in a real scene and returns it with its gradient. */
async function lightTable(): Promise<{
  light: TableLight;
  gradient: GameObjects.Gradient;
}> {
  run = await runBareScene();
  const light = new TableLight(run.scene);
  const gradient = run.scene.children.list.find(
    (object) => object instanceof GameObjects.Gradient,
  );
  if (!gradient) throw new Error("The light made no gradient");
  return { light, gradient };
}

/** Returns a colour as the fractions of red, green, blue and alpha it holds. */
function fractionsOf(color: Display.Color): number[] {
  return [color.redGL, color.greenGL, color.blueGL, color.alphaGL].map(
    (fraction) => Math.round(fraction * 100) / 100,
  );
}

describe("TableLight", () => {
  it("lies beneath the placeholders, so it never darkens a card", async () => {
    const { gradient } = await lightTable();

    expect(gradient.depth).toBe(depthFor(RenderLayer.TABLE_LIGHT));
  });

  it("centres the light above the middle of the board", async () => {
    const { light, gradient } = await lightTable();

    light.fit(1000, 800);

    expect([gradient.x, gradient.y]).toEqual([500, 256]);
  });

  it("stretches the gradient's circle into the board's ellipse", async () => {
    // The gradient is a circle filling its quad, so the quad spans twice each
    // radius.
    const { light, gradient } = await lightTable();

    light.fit(1000, 800);

    expect([gradient.width, gradient.height]).toEqual([2500, 1680]);
  });

  it("centres the gradient on the light's centre at any size", async () => {
    // Phaser fixes the origin in pixels when it is set, so a resize alone
    // would leave the gradient hanging from its old corner.
    const { light, gradient } = await lightTable();

    light.fit(1000, 800);

    expect([gradient.displayOriginX, gradient.displayOriginY]).toEqual([
      1250, 840,
    ]);
  });

  it("leaves the felt clear until it darkens towards the rim", async () => {
    const { gradient } = await lightTable();

    const bands = gradient.ramp.bands.map((band) => ({
      start: band.start,
      end: band.end,
      from: fractionsOf(band.colorStart),
      to: fractionsOf(band.colorEnd),
    }));

    expect(bands).toEqual([
      {
        start: 0,
        end: TABLE_LIGHT.litTo,
        from: [0, 0, 0, 0],
        to: [0, 0, 0, 0],
      },
      {
        start: TABLE_LIGHT.litTo,
        end: 1,
        from: [0, 0, 0, 0],
        to: [0, 0, 0, TABLE_LIGHT.rimAlpha],
      },
    ]);
  });

  it("spreads the light as an ellipse, keeping the rim's darkness beyond it", async () => {
    // The board's corners can lie outside the ellipse, and should not be lit.
    const { gradient } = await lightTable();

    expect([gradient.shapeMode, gradient.repeatMode, gradient.dither]).toEqual([
      2,
      0,
      true,
    ]);
  });

  it("removes the gradient when destroyed", async () => {
    const { light, gradient } = await lightTable();

    light.destroy();

    expect(run?.scene.children.exists(gradient)).toBe(false);
  });

  it("draws without error frame after frame", async () => {
    const { light } = await lightTable();
    light.fit(1000, 800);

    expect(() => run?.advance(48)).not.toThrow();
  });
});
