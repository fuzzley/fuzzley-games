import { runBareScene } from "@fz/phaser/testing";
import type { GameObjects } from "phaser";
import { LIGHT_MADE_UP, madeUpFrames } from "../testing/made_up/field";
import { ATLAS, WallAtlas } from "./atlas";
import { placeDot } from "./painter";

/**
 * Returns an image of the made-up dot, baked at a unit of 40 device
 * pixels, 8 wide, in a scene running till the test finishes.
 */
async function bakedDot(): Promise<GameObjects.Image> {
  const run = await runBareScene();
  onTestFinished(() => {
    run.destroy();
  });
  new WallAtlas(run.scene, madeUpFrames, LIGHT_MADE_UP, {
    unit: 40,
    pixelRatio: 1,
  });
  return run.scene.add.image(0, 0, ATLAS, "dot");
}

describe("placeDot", () => {
  it("shows a dot scaled to a whole number of pixels wide and high", async () => {
    const dot = await bakedDot();

    placeDot(dot, 100, 100, 1.4);

    expect([dot.displayWidth, dot.displayHeight]).toEqual([11, 11]);
  });

  it("stands a dot about a point with its edges on whole pixels", async () => {
    const dot = await bakedDot();

    placeDot(dot, 10.3, 20.8, 1.4);

    expect({
      x: dot.x,
      y: dot.y,
      edges: [dot.x - 5.5, dot.x + 5.5, dot.y - 5.5, dot.y + 5.5],
    }).toEqual({ x: 10.5, y: 20.5, edges: [5, 16, 15, 26] });
  });

  it("stands a dot an even number of pixels wide on a pixel's corner nearest the point", async () => {
    const dot = await bakedDot();

    placeDot(dot, 10.4, 20.6, 1);

    expect([dot.x, dot.y]).toEqual([10, 21]);
  });

  it("returns the dot it places", async () => {
    const dot = await bakedDot();

    expect(placeDot(dot, 0, 0, 1)).toBe(dot);
  });
});
