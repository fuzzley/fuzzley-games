import { CANVAS, Events, GameObjects, Scene, Textures } from "phaser";
import type { MockInstance } from "vitest";
import type { HostedScene, SceneSurroundings } from "../host";
import { type SceneRun, runScene } from "../testing";
import { bakeTexture } from "./bake_texture";

/** A scene that does nothing of its own, to bake textures in. */
class BareScene extends Scene implements HostedScene {
  readonly key = "bare";

  constructor(readonly surroundings: SceneSurroundings) {
    super("bare");
  }
}

/** Runs a bare scene. */
async function runBare(): Promise<SceneRun<BareScene>> {
  return runScene((surroundings) => new BareScene(surroundings));
}

/** Returns the canvas texture under a key, failing if there is none. */
function canvasTexture(scene: Scene, key: string): Textures.CanvasTexture {
  const texture = scene.textures.get(key);
  if (!(texture instanceof Textures.CanvasTexture)) {
    throw new Error(`No canvas texture "${key}"`);
  }
  return texture;
}

/**
 * Lets a headless scene take the path a renderer takes, with Graphics'
 * drawing into a texture, which needs a real renderer, stood in for.
 */
function pretendToRender(
  run: SceneRun<BareScene>,
): MockInstance<GameObjects.Graphics["generateTexture"]> {
  Object.assign(run.game.config, { renderType: CANVAS });
  return vi
    .spyOn(GameObjects.Graphics.prototype, "generateTexture")
    .mockImplementation(function generateTexture(this: GameObjects.Graphics) {
      return this;
    });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("bakeTexture", () => {
  it("leaves a blank texture of the size in a headless game", async () => {
    const run = await runBare();
    const draw = vi.fn();

    bakeTexture(run.scene, "apple", 24, 16, draw);

    const texture = canvasTexture(run.scene, "apple");
    expect({
      size: [texture.width, texture.height],
      drawn: draw.mock.calls.length,
    }).toEqual({ size: [24, 16], drawn: 0 });
    run.destroy();
  });

  it("bakes again at a new size", async () => {
    const run = await runBare();
    bakeTexture(run.scene, "apple", 24, 24, vi.fn());

    bakeTexture(run.scene, "apple", 40, 30, vi.fn());

    const texture = canvasTexture(run.scene, "apple");
    expect([texture.width, texture.height]).toEqual([40, 30]);
    run.destroy();
  });

  it("draws over the texture already there where there is a renderer", async () => {
    const run = await runBare();
    bakeTexture(run.scene, "apple", 24, 24, vi.fn());
    const first = run.scene.textures.get("apple");
    pretendToRender(run);

    bakeTexture(run.scene, "apple", 24, 24, vi.fn());

    expect(run.scene.textures.get("apple")).toBe(first);
    run.destroy();
  });

  it("replaces a texture of the key that isn't a canvas", async () => {
    const run = await runBare();
    run.scene.textures.addImage("apple", new Image());

    bakeTexture(run.scene, "apple", 8, 8, vi.fn());

    expect(run.scene.textures.get("apple")).toBeInstanceOf(
      Textures.CanvasTexture,
    );
    run.destroy();
  });

  it("draws the texture with a Graphics, then lets the Graphics go", async () => {
    const run = await runBare();
    const generate = pretendToRender(run);
    let drawnWith: GameObjects.Graphics | undefined;

    bakeTexture(run.scene, "apple", 24, 16, (graphics) => {
      drawnWith = graphics;
    });

    expect({
      generated: generate.mock.calls,
      gone: drawnWith?.scene === undefined,
    }).toEqual({ generated: [["apple", 24, 16]], gone: true });
    run.destroy();
  });

  it("draws every texture again once a lost context is restored", async () => {
    const run = await runBare();
    const renderer = new Events.EventEmitter();
    Object.assign(run.scene, { renderer });
    const apple = vi.fn();
    const crumb = vi.fn();
    bakeTexture(run.scene, "apple", 24, 24, apple);
    bakeTexture(run.scene, "crumb", 4, 4, crumb);
    pretendToRender(run);

    renderer.emit("restorewebgl");

    expect([apple.mock.calls.length, crumb.mock.calls.length]).toEqual([1, 1]);
    run.destroy();
  });

  it("draws a texture again with what it was last baked with", async () => {
    const run = await runBare();
    const renderer = new Events.EventEmitter();
    Object.assign(run.scene, { renderer });
    const before = vi.fn();
    const after = vi.fn();
    bakeTexture(run.scene, "apple", 24, 24, before);
    bakeTexture(run.scene, "apple", 32, 32, after);
    pretendToRender(run);

    renderer.emit("restorewebgl");

    expect([before.mock.calls.length, after.mock.calls.length]).toEqual([0, 1]);
    run.destroy();
  });
});
