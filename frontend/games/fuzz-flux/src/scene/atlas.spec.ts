import type { ArtScale } from "@fz/phaser/shapes";
import { BakedAtlas } from "@fz/phaser/scene";
import { runBareScene, watchUploads } from "@fz/phaser/testing";
import type { Scene } from "phaser";
import { ART_PALETTE } from "../testing/art_frames";
import { MOVE_FIXTURES } from "../testing/move_fixtures";
import { type Board, DARK, startBoard } from "../testing/scene_shell";
import { FRAMES, FRAME_NAMES } from "../view/art/frame_names";
import { atlasFrames, bakedScale } from "../view/art/frames";
import { ATLAS, BOARD_ATLAS } from "./atlas";

/** A square's scale at a pixel to a CSS pixel, its side as given. */
function sideOf(unit: number): ArtScale {
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

/** Returns how wide the art draws a square's well for a square, as the atlas bakes it for one. */
function wellWidth(square: ArtScale): number | undefined {
  return atlasFrames(ART_PALETTE, bakedScale(square)).find(
    ({ name }) => name === FRAMES.square,
  )?.width;
}

/** Returns how wide the atlas holds a square's well. */
function bakedWellWidth(scene: Scene): number {
  return scene.textures.getFrame(ATLAS, FRAMES.square).width;
}

/** Returns a count of the atlas's bakes from now on, each uploading its canvas once. */
function countBakes(scene: Scene): () => number {
  const atlas = scene.textures.get(ATLAS).getSourceImage();
  let bakes = 0;
  watchUploads(scene, (canvas) => {
    if (canvas === atlas) bakes++;
  });
  return () => bakes;
}

/** Runs the scene on the bunch's board. */
function startScene(): Promise<Board> {
  return startBoard(MOVE_FIXTURES.bunch);
}

describe("BOARD_ATLAS", () => {
  it("bakes every frame the art names, for the square and in the palette", async () => {
    const scene = await bareScene();

    const atlas = new BakedAtlas(scene, BOARD_ATLAS, DARK, sideOf(60));

    expect({
      missing: FRAME_NAMES.filter(
        (name) => !scene.textures.get(ATLAS).has(name),
      ),
      well: bakedWellWidth(scene),
      scale: atlas.scale,
      palette: atlas.palette,
    }).toEqual({
      missing: [],
      well: wellWidth(sideOf(60)),
      scale: sideOf(60),
      palette: DARK,
    });
  });

  it("bakes no larger than the art caps a square at", async () => {
    const scene = await bareScene();

    const atlas = new BakedAtlas(scene, BOARD_ATLAS, ART_PALETTE, sideOf(400));

    expect([bakedWellWidth(scene), atlas.scale]).toEqual([
      wellWidth(sideOf(400)),
      bakedScale(sideOf(400)),
    ]);
  });

  it("draws the atlas again once a lost WebGL context is restored", async () => {
    const { run } = await startScene();
    await run.loseContext();
    const bakes = countBakes(run.scene);

    await run.restoreContext();

    expect(bakes()).toBe(1);
  });
});

describe("the scene's atlas", () => {
  it("is baked for the square the board is laid out at", async () => {
    const { shell, run } = await startScene();
    const square = shell.layouts.at(-1)?.square ?? 0;

    expect(bakedWellWidth(run.scene)).toBe(wellWidth(sideOf(square)));
  });

  it("bakes no more while nothing changes", async () => {
    const { run } = await startScene();
    const bakes = countBakes(run.scene);

    run.advance(64);

    expect(bakes()).toBe(0);
  });

  it("bakes again as the shell hands it a new palette", async () => {
    const { shell, run } = await startScene();
    const bakes = countBakes(run.scene);

    shell.colors = DARK;
    run.advance(16);

    expect(bakes()).toBe(1);
  });

  it("bakes again as the board is laid out at a new square", async () => {
    const { shell, run } = await startScene();

    run.game.scale.resize(300, 300);
    run.advance(16);

    expect(bakedWellWidth(run.scene)).toBe(
      wellWidth(sideOf(shell.layouts.at(-1)?.square ?? 0)),
    );
  });
});
