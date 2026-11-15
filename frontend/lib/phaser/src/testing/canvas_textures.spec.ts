import type { HostedScene } from "../host";
import { canvasTexture } from "./canvas_textures";
import { type SceneRun, runBareScene } from "./run_scene";

let run: SceneRun<HostedScene> | null = null;

afterEach(() => {
  run?.destroy();
  run = null;
});

describe("canvasTexture", () => {
  it("returns the canvas texture under a key", async () => {
    run = await runBareScene();
    const made = run.scene.textures.createCanvas("apple", 8, 8);

    const found = canvasTexture(run.scene, "apple");

    expect(found).toBe(made);
  });

  it("throws for a key that names no texture", async () => {
    run = await runBareScene();
    const { scene } = run;

    const find = (): void => {
      canvasTexture(scene, "pear");
    };

    expect(find).toThrow('No canvas texture "pear"');
  });

  it("throws for a texture that isn't drawn on a canvas of its own", async () => {
    run = await runBareScene();
    const { scene } = run;
    scene.textures.addImage("photo", new Image(4, 4));

    const find = (): void => {
      canvasTexture(scene, "photo");
    };

    expect(find).toThrow('No canvas texture "photo"');
  });
});
