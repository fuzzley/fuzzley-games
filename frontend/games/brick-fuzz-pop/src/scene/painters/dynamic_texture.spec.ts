import type { HostedScene } from "@fz/phaser/host";
import { type SceneRun, runBareScene } from "@fz/phaser/testing";
import { Textures } from "phaser";
import { dynamicTexture } from "./dynamic_texture";

describe("dynamicTexture", () => {
  let run: SceneRun<HostedScene> | null = null;

  afterEach(() => {
    run?.destroy();
    run = null;
  });

  it("makes a dynamic texture of a key the scene's textures lack", async () => {
    run = await runBareScene();

    const made = dynamicTexture(run.scene, "bake");

    expect({
      dynamic: made instanceof Textures.DynamicTexture,
      kept: run.scene.textures.get("bake") === made,
    }).toEqual({ dynamic: true, kept: true });
  });

  it("hands back the dynamic texture already of a key", async () => {
    run = await runBareScene();
    const made = dynamicTexture(run.scene, "bake");

    const again = dynamicTexture(run.scene, "bake");

    expect(again).toBe(made);
  });

  it("puts a dynamic texture in the place of another kind of texture of a key", async () => {
    run = await runBareScene();
    run.scene.textures.createCanvas("bake", 4, 4);

    const made = dynamicTexture(run.scene, "bake");

    expect({
      dynamic: made instanceof Textures.DynamicTexture,
      kept: run.scene.textures.get("bake") === made,
    }).toEqual({ dynamic: true, kept: true });
  });
});
