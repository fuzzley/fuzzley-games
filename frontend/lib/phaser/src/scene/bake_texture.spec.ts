import { GameObjects, type Scene, Textures } from "phaser";
import { runBareScene, watchUploads } from "../testing";
import { bakeTexture } from "./bake_texture";

/** Returns the canvas texture under a key, failing if there is none. */
function canvasTexture(scene: Scene, key: string): Textures.CanvasTexture {
  const texture = scene.textures.get(key);
  if (!(texture instanceof Textures.CanvasTexture)) {
    throw new Error(`No canvas texture "${key}"`);
  }
  return texture;
}

/** What a scene's bakes did, from when {@link recordBakes} began to watch them. */
interface Bakes {
  /**
   * Returns each picture a `Graphics` drew, as "draw", and each canvas the
   * game uploaded, as "upload", in turn.
   */
  steps(): string[];
  /** Returns what the last picture was drawn on. */
  drawnOn(): unknown;
}

/**
 * Watches each picture a `Graphics` draws from now on, and each canvas the
 * game uploads, until the test finishes.
 */
function recordBakes(scene: Scene): Bakes {
  const draws = vi.spyOn(GameObjects.Graphics.prototype, "generateTexture");
  onTestFinished(() => {
    draws.mockRestore();
  });
  const uploads = vi.fn<(canvas: HTMLCanvasElement) => void>();
  watchUploads(scene, uploads);
  const stepsOf = (calls: readonly number[], step: string) =>
    calls.map((order) => ({ order, step }));
  return {
    steps: () =>
      [
        ...stepsOf(draws.mock.invocationCallOrder, "draw"),
        ...stepsOf(uploads.mock.invocationCallOrder, "upload"),
      ]
        .sort((a, b) => a.order - b.order)
        .map(({ step }) => step),
    drawnOn: () => draws.mock.lastCall?.[0],
  };
}

describe("bakeTexture", () => {
  it("bakes a canvas texture of the size", async () => {
    const run = await runBareScene();

    bakeTexture(run.scene, "apple", 24, 16, vi.fn());

    const texture = canvasTexture(run.scene, "apple");
    expect([texture.width, texture.height]).toEqual([24, 16]);
    run.destroy();
  });

  it("bakes again at a new size", async () => {
    const run = await runBareScene();
    bakeTexture(run.scene, "apple", 24, 24, vi.fn());

    bakeTexture(run.scene, "apple", 40, 30, vi.fn());

    const texture = canvasTexture(run.scene, "apple");
    expect([texture.width, texture.height]).toEqual([40, 30]);
    run.destroy();
  });

  it.each([
    [24, 24],
    [40, 30],
  ])(
    "draws over the texture already there, baked again at %i × %i",
    async (width, height) => {
      const run = await runBareScene();
      bakeTexture(run.scene, "apple", 24, 24, vi.fn());
      const first = run.scene.textures.get("apple");

      bakeTexture(run.scene, "apple", width, height, vi.fn());

      expect(run.scene.textures.get("apple")).toBe(first);
      run.destroy();
    },
  );

  it("draws a new texture on its canvas, then uploads it once", async () => {
    const run = await runBareScene();
    const bakes = recordBakes(run.scene);

    bakeTexture(run.scene, "apple", 24, 24, vi.fn());

    expect(bakes.steps()).toEqual(["draw", "upload"]);
    expect(bakes.drawnOn()).toBe(canvasTexture(run.scene, "apple").canvas);
    run.destroy();
  });

  it.each([
    [24, 24],
    [40, 30],
  ])(
    "draws the texture already there anew on its canvas, then uploads it once, baked again at %i × %i",
    async (width, height) => {
      const run = await runBareScene();
      bakeTexture(run.scene, "apple", 24, 24, vi.fn());
      const bakes = recordBakes(run.scene);

      bakeTexture(run.scene, "apple", width, height, vi.fn());

      expect(bakes.steps()).toEqual(["draw", "upload"]);
      expect(bakes.drawnOn()).toBe(canvasTexture(run.scene, "apple").canvas);
      run.destroy();
    },
  );

  it("replaces a texture of the key that isn't a canvas", async () => {
    const run = await runBareScene();
    run.scene.textures.addImage("apple", new Image());

    bakeTexture(run.scene, "apple", 8, 8, vi.fn());

    expect(run.scene.textures.get("apple")).toBeInstanceOf(
      Textures.CanvasTexture,
    );
    run.destroy();
  });

  it("draws the texture with a Graphics, then lets the Graphics go", async () => {
    const run = await runBareScene();
    let drawnWith: GameObjects.Graphics | undefined;

    bakeTexture(run.scene, "apple", 24, 16, (graphics) => {
      drawnWith = graphics;
    });

    expect(drawnWith?.scene).toBeUndefined();
    run.destroy();
  });

  it("draws every texture again once a lost context is restored", async () => {
    const run = await runBareScene();
    const apple = vi.fn();
    const crumb = vi.fn();
    bakeTexture(run.scene, "apple", 24, 24, apple);
    bakeTexture(run.scene, "crumb", 4, 4, crumb);
    await run.loseContext();

    await run.restoreContext();

    expect([apple.mock.calls.length, crumb.mock.calls.length]).toEqual([2, 2]);
    run.destroy();
  });

  it("draws a texture again with what it was last baked with", async () => {
    const run = await runBareScene();
    const before = vi.fn();
    const after = vi.fn();
    bakeTexture(run.scene, "apple", 24, 24, before);
    bakeTexture(run.scene, "apple", 32, 32, after);
    await run.loseContext();

    await run.restoreContext();

    expect([before.mock.calls.length, after.mock.calls.length]).toEqual([1, 2]);
    run.destroy();
  });
});
