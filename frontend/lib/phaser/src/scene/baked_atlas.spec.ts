import type { Scene } from "phaser";
import type { ArtFrame, ArtScale } from "../shapes";
import { runBareScene } from "../testing";
import { type AtlasBaking, BakedAtlas } from "./baked_atlas";

/** A made-up game's palette, by its name. */
type Palette = "light" | "dark";

/** The made-up game's atlas's key. */
const KEY = "made-up-atlas";

/** The largest unit the made-up game bakes at, in device pixels. */
const MOST_UNIT = 100;

/** A layout's scale at a pixel to a CSS pixel, its unit as given. */
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

/**
 * Returns an atlas of the made-up game's one frame, a cell a unit wide, at
 * its layout's unit up to {@link MOST_UNIT}, or at the scale given, and the
 * palettes and scales it drew its frames in.
 */
function countingAtlas(
  scene: Scene,
  layout: ArtScale,
  scaleOf: AtlasBaking<Palette>["scaleOf"] = ({ unit, pixelRatio }) => ({
    unit: Math.min(unit, MOST_UNIT),
    pixelRatio,
  }),
): { atlas: BakedAtlas<Palette>; drawn: [Palette, ArtScale][] } {
  const drawn: [Palette, ArtScale][] = [];
  const framesOf = (palette: Palette, scale: ArtScale): ArtFrame[] => {
    drawn.push([palette, scale]);
    return [{ name: "cell", width: scale.unit, height: 1, commands: [] }];
  };
  const atlas = new BakedAtlas<Palette>(
    scene,
    { key: KEY, framesOf, scaleOf },
    "light",
    layout,
  );
  return { atlas, drawn };
}

/** Returns how wide the atlas's frame of a cell is, in device pixels. */
function cellWidth(scene: Scene): number {
  return scene.textures.getFrame(KEY, "cell").width;
}

describe("BakedAtlas", () => {
  it("bakes the game's frames under its key as it is made, in its palette and at the scale its layout's bakes at", async () => {
    const scene = await bareScene();

    const { atlas, drawn } = countingAtlas(scene, unitOf(36));

    expect({
      cell: cellWidth(scene),
      scale: atlas.scale,
      palette: atlas.palette,
      drawn,
    }).toEqual({
      cell: 36,
      scale: unitOf(36),
      palette: "light",
      drawn: [["light", unitOf(36)]],
    });
  });

  it("bakes at the scale the game gives a layout's, such as one capped", async () => {
    const scene = await bareScene();

    const { atlas } = countingAtlas(scene, unitOf(260));

    expect([cellWidth(scene), atlas.scale]).toEqual([
      MOST_UNIT,
      unitOf(MOST_UNIT),
    ]);
  });

  it("bakes nothing again for the palette and the scale it baked in", async () => {
    const scene = await bareScene();
    const { atlas, drawn } = countingAtlas(scene, unitOf(36));

    const baked = atlas.bakeFor("light", { ...unitOf(36) });

    expect({ baked, drawn: drawn.length }).toEqual({ baked: false, drawn: 1 });
  });

  it("bakes again in a new palette", async () => {
    const scene = await bareScene();
    const { atlas, drawn } = countingAtlas(scene, unitOf(36));

    const baked = atlas.bakeFor("dark", unitOf(36));

    expect({ baked, drawn: drawn.at(-1), palette: atlas.palette }).toEqual({
      baked: true,
      drawn: ["dark", unitOf(36)],
      palette: "dark",
    });
  });

  it("bakes again for a layout of a new unit", async () => {
    const scene = await bareScene();
    const { atlas } = countingAtlas(scene, unitOf(36));

    const baked = atlas.bakeFor("light", unitOf(48));

    expect({ baked, cell: cellWidth(scene), scale: atlas.scale }).toEqual({
      baked: true,
      cell: 48,
      scale: unitOf(48),
    });
  });

  it("bakes again at a new pixel ratio, though the unit stays", async () => {
    const scene = await bareScene();
    const { atlas } = countingAtlas(scene, unitOf(36));

    const baked = atlas.bakeFor("light", { unit: 36, pixelRatio: 2 });

    expect({ baked, scale: atlas.scale }).toEqual({
      baked: true,
      scale: { unit: 36, pixelRatio: 2 },
    });
  });

  it("bakes nothing again for a layout of a new unit that bakes at the scale it baked at", async () => {
    const scene = await bareScene();
    const { atlas, drawn } = countingAtlas(scene, unitOf(200));

    const baked = atlas.bakeFor("light", unitOf(260));

    expect({ baked, drawn: drawn.length }).toEqual({ baked: false, drawn: 1 });
  });

  it("hands over a new scale at each bake, though the game bakes at the layout's", async () => {
    const scene = await bareScene();
    const layout = unitOf(36);
    const { atlas } = countingAtlas(scene, layout, (scale) => scale);
    const first = atlas.scale;

    atlas.bakeFor("dark", layout);

    expect(atlas.scale).not.toBe(first);
  });

  it("keeps a scale of its own, apart from the layout's the game bakes at", async () => {
    const scene = await bareScene();
    const layout = unitOf(36);

    const { atlas } = countingAtlas(scene, layout, (scale) => scale);

    expect(atlas.scale).not.toBe(layout);
  });

  it("has every image on it take up its frame anew as it bakes again", async () => {
    const scene = await bareScene();
    const { atlas } = countingAtlas(scene, unitOf(36));
    const cell = scene.add.image(0, 0, KEY, "cell");

    atlas.bakeFor("light", unitOf(48));

    expect([cell.width, cell.displayOriginX]).toEqual([48, 24]);
  });
});
