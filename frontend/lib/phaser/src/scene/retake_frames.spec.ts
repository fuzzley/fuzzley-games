import type { GameObjects, Scene } from "phaser";
import type { HostedScene } from "../host";
import { type SceneRun, runBareScene } from "../testing";
import { type AtlasFrame, bakeAtlas } from "./bake_atlas";
import { bakeTexture } from "./bake_texture";
import { retakeFrames } from "./retake_frames";

/** Returns a square frame of a size that draws nothing. */
function square(name: string, side: number): AtlasFrame {
  return { name, width: side, height: side, draw: vi.fn() };
}

/** Bakes an atlas of frames "a" and "b", each a square of its side. */
function bake(scene: Scene, key: string, a: number, b: number): void {
  bakeAtlas(scene, key, [square("a", a), square("b", b)]);
}

/** Says what an image shows: its frame, its width and its origin, in pixels. */
function shown(image: GameObjects.Image | GameObjects.Sprite): {
  frame: string;
  width: number;
  originX: number;
} {
  return {
    frame: image.frame.name,
    width: image.width,
    originX: image.displayOriginX,
  };
}

describe("retakeFrames", () => {
  let run: SceneRun<HostedScene> | null = null;

  /** Starts a bare scene to bake and show images in. */
  async function startScene(): Promise<Scene> {
    run = await runBareScene();
    return run.scene;
  }

  afterEach(() => {
    run?.destroy();
    run = null;
  });

  it("has each image of the atlas take its frame's new size and origin", async () => {
    const scene = await startScene();
    bake(scene, "atlas", 10, 6);
    const images = ["a", "b"].map((frame) =>
      scene.add.image(0, 0, "atlas", frame),
    );
    bake(scene, "atlas", 20, 12);

    retakeFrames(scene, "atlas");

    expect(images.map(shown)).toEqual([
      { frame: "a", width: 20, originX: 10 },
      { frame: "b", width: 12, originX: 6 },
    ]);
  });

  it("reaches a sprite, and the images in layers and containers", async () => {
    const scene = await startScene();
    bake(scene, "atlas", 10, 6);
    const sprite = scene.add.sprite(0, 0, "atlas", "a");
    const layered = scene.add.image(0, 0, "atlas", "a");
    scene.add.layer(layered);
    const contained = scene.add.image(0, 0, "atlas", "a");
    scene.add.layer(scene.add.container(0, 0, contained));
    bake(scene, "atlas", 20, 12);

    retakeFrames(scene, "atlas");

    expect([sprite, layered, contained].map((image) => image.width)).toEqual([
      20, 20, 20,
    ]);
  });

  it("leaves the images of another texture as they were", async () => {
    const scene = await startScene();
    bake(scene, "atlas", 10, 6);
    bake(scene, "other", 10, 6);
    const other = scene.add.image(0, 0, "other", "a");
    bake(scene, "atlas", 20, 12);
    bake(scene, "other", 20, 12);

    retakeFrames(scene, "atlas");

    expect(shown(other)).toEqual({ frame: "a", width: 10, originX: 5 });
  });

  it("has an image of a texture baked whole take its new size", async () => {
    const scene = await startScene();
    const draw = vi.fn();
    bakeTexture(scene, "apple", 10, 10, draw);
    const apple = scene.add.image(0, 0, "apple");
    bakeTexture(scene, "apple", 24, 24, draw);

    retakeFrames(scene, "apple");

    expect(shown(apple)).toEqual({ frame: "__BASE", width: 24, originX: 12 });
  });
});
