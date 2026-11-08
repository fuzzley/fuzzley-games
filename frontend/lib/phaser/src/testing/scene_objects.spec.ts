import type { Scene } from "phaser";
import type { HostedScene } from "../host";
import { type SceneRun, runBareScene } from "./run_scene";
import { imagesIn, objectsIn } from "./scene_objects";

let run: SceneRun<HostedScene> | null = null;

/** Returns a bare scene to make game objects in. */
async function bareScene(): Promise<Scene> {
  run = await runBareScene();
  return run.scene;
}

afterEach(() => {
  run?.destroy();
  run = null;
});

describe("objectsIn", () => {
  it("counts every game object a scene holds, its layers and theirs too, however deep", async () => {
    const scene = await bareScene();
    scene.add.image(0, 0, "__DEFAULT");
    const layer = scene.add.layer([
      scene.add.image(0, 0, "__DEFAULT"),
      scene.add.graphics(),
    ]);

    layer.add(scene.add.layer([scene.add.rectangle(0, 0, 4, 4)]));

    // An image; a layer, its image and its graphics; a layer in it, and its
    // rectangle.
    expect(objectsIn(scene)).toBe(6);
  });
});

describe("imagesIn", () => {
  it("finds every image a scene holds, those in its layers too, however deep", async () => {
    const scene = await bareScene();
    const loose = scene.add.image(0, 0, "__DEFAULT");
    const layered = scene.add.image(0, 0, "__DEFAULT");
    const nested = scene.add.image(0, 0, "__DEFAULT");
    const layer = scene.add.layer([layered, scene.add.graphics()]);

    layer.add(scene.add.layer([nested, scene.add.rectangle(0, 0, 4, 4)]));

    expect(imagesIn(scene)).toEqual([loose, layered, nested]);
  });
});
