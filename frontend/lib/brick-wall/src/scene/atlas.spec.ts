import type { ArtScale } from "@fz/phaser/shapes";
import { runBareScene } from "@fz/phaser/testing";
import type { Scene } from "phaser";
import type { WallPalette } from "../view/palette";
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

/** Returns an atlas of the made-up frames, which counts the palettes and the scales it drew them in. */
function countingAtlas(
  scene: Scene,
  layout: ArtScale,
): { atlas: WallAtlas<WallPalette>; drawn: [WallPalette, ArtScale][] } {
  const drawn: [WallPalette, ArtScale][] = [];
  const atlas = new WallAtlas(
    scene,
    (palette, scale) => {
      drawn.push([palette, scale]);
      return madeUpFrames(palette, scale);
    },
    LIGHT_MADE_UP,
    layout,
  );
  return { atlas, drawn };
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

  it("bakes nothing again for the palette and the scale it was baked in", async () => {
    const scene = await bareScene();
    const { atlas, drawn } = countingAtlas(scene, unitOf(36));

    const baked = atlas.bakeFor(LIGHT_MADE_UP, { ...unitOf(36) });

    expect({ baked, drawn: drawn.length }).toEqual({ baked: false, drawn: 1 });
  });

  it("bakes again in a new palette", async () => {
    const scene = await bareScene();
    const { atlas, drawn } = countingAtlas(scene, unitOf(36));

    const baked = atlas.bakeFor(DARK_MADE_UP, unitOf(36));

    expect({ baked, drawn: drawn.at(-1), palette: atlas.palette }).toEqual({
      baked: true,
      drawn: [DARK_MADE_UP, unitOf(36)],
      palette: DARK_MADE_UP,
    });
  });

  it("bakes again at a new unit", async () => {
    const scene = await bareScene();
    const { atlas } = countingAtlas(scene, unitOf(36));

    const baked = atlas.bakeFor(LIGHT_MADE_UP, unitOf(48));

    expect({ baked, cell: cellWidth(scene), scale: atlas.scale }).toEqual({
      baked: true,
      cell: 48,
      scale: unitOf(48),
    });
  });

  it("bakes again at a new pixel ratio, though the unit stays", async () => {
    const scene = await bareScene();
    const { atlas } = countingAtlas(scene, unitOf(36));

    const baked = atlas.bakeFor(LIGHT_MADE_UP, { unit: 36, pixelRatio: 2 });

    expect({ baked, scale: atlas.scale }).toEqual({
      baked: true,
      scale: { unit: 36, pixelRatio: 2 },
    });
  });

  it("bakes nothing again for a new unit past its largest", async () => {
    const scene = await bareScene();
    const { atlas, drawn } = countingAtlas(scene, unitOf(200));

    const baked = atlas.bakeFor(LIGHT_MADE_UP, unitOf(260));

    expect({ baked, drawn: drawn.length }).toEqual({ baked: false, drawn: 1 });
  });

  it("hands a new scale over at each bake", async () => {
    const scene = await bareScene();
    const { atlas } = countingAtlas(scene, unitOf(36));
    const first = atlas.scale;

    atlas.bakeFor(DARK_MADE_UP, unitOf(36));

    expect(atlas.scale).not.toBe(first);
  });

  it("has every image on it take up its frame anew as it bakes again", async () => {
    const scene = await bareScene();
    const { atlas } = countingAtlas(scene, unitOf(36));
    const cell = scene.add.image(0, 0, ATLAS, "cell");

    atlas.bakeFor(LIGHT_MADE_UP, unitOf(48));

    expect([cell.width, cell.displayOriginX]).toEqual([48, 24]);
  });
});
