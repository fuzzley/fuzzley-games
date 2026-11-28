import type { ArtScale } from "@fz/phaser/shapes";
import { runBareScene } from "@fz/phaser/testing";
import type { Scene } from "phaser";
import {
  DARK_MADE_UP,
  LIGHT_MADE_UP,
  madeUpFrames,
} from "../testing/made_up/field";
import { ATLAS, MOST_BAKED_UNIT, WallAtlas, bakedScaleOf } from "./atlas";

/** A field's scale at a pixel to a CSS pixel, its unit as given. */
function unitOf(unit: number): ArtScale {
  return { unit, pixelRatio: 1 };
}

/** Returns a scene running till the test finishes. */
async function bareScene(): Promise<Scene> {
  const run = await runBareScene();
  onTestFinished(() => {
    run.destroy();
  });
  return run.scene;
}

/** Returns how wide the atlas's frame of a cell is, in device pixels. */
function cellWidth(scene: Scene): number {
  return scene.textures.getFrame(ATLAS, "cell").width;
}

describe("bakedScaleOf", () => {
  it("bakes at a field's unit and pixel ratio", () => {
    expect(bakedScaleOf({ unit: 62, pixelRatio: 2 })).toEqual({
      unit: 62,
      pixelRatio: 2,
    });
  });

  it("bakes at no more than the largest unit, at the field's pixel ratio", () => {
    expect(bakedScaleOf({ unit: 291, pixelRatio: 3 })).toEqual({
      unit: MOST_BAKED_UNIT,
      pixelRatio: 3,
    });
  });
});

describe("WallAtlas", () => {
  it("bakes a game's frames as it is made, at the field's scale and in the palette", async () => {
    const scene = await bareScene();

    const atlas = new WallAtlas(scene, madeUpFrames, DARK_MADE_UP, unitOf(36));

    expect({
      cell: cellWidth(scene),
      scale: atlas.scale,
      palette: atlas.palette,
    }).toEqual({ cell: 36, scale: unitOf(36), palette: DARK_MADE_UP });
  });

  it("bakes at no more than the largest unit", async () => {
    const scene = await bareScene();

    const atlas = new WallAtlas(
      scene,
      madeUpFrames,
      LIGHT_MADE_UP,
      unitOf(300),
    );

    expect([cellWidth(scene), atlas.scale.unit]).toEqual([
      MOST_BAKED_UNIT,
      MOST_BAKED_UNIT,
    ]);
  });
});
