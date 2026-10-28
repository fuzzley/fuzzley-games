import { Events, Scene } from "phaser";
import type { HostedScene, SceneSurroundings } from "../host";
import { type SceneRun, runScene } from "../testing";
import {
  onContextRestored,
  onFirstFrame,
  onScaleResize,
  pixelRatioOf,
  whenSceneEnds,
} from "./scene_lifetime";

/** A scene that does nothing of its own, for the helpers to follow. */
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

/** Gives a scene a renderer that can lose its context, as a WebGL one can. */
function giveRenderer(scene: Scene): Events.EventEmitter {
  const renderer = new Events.EventEmitter();
  Object.assign(scene, { renderer });
  return renderer;
}

describe("whenSceneEnds", () => {
  it("releases once the scene is stopped", async () => {
    const run = await runBare();
    const release = vi.fn();
    whenSceneEnds(run.scene, release);

    run.game.scene.stop("bare");
    run.advance(16);

    expect(release).toHaveBeenCalledOnce();
    run.destroy();
  });

  it("releases once the game is destroyed", async () => {
    const run = await runBare();
    const release = vi.fn();
    whenSceneEnds(run.scene, release);

    run.destroy();

    expect(release).toHaveBeenCalledOnce();
  });

  it("releases only once, however the scene ends", async () => {
    const run = await runBare();
    const release = vi.fn();
    whenSceneEnds(run.scene, release);
    run.game.scene.stop("bare");
    run.advance(16);

    run.destroy();

    expect(release).toHaveBeenCalledOnce();
  });
});

describe("onScaleResize", () => {
  it("calls the listener when the canvas changes size", async () => {
    const run = await runBare();
    const listener = vi.fn();
    onScaleResize(run.scene, listener);

    run.game.scale.resize(300, 200);

    expect(listener).toHaveBeenCalledOnce();
    run.destroy();
  });

  it("stops once the scene has ended", async () => {
    const run = await runBare();
    const listener = vi.fn();
    onScaleResize(run.scene, listener);
    run.game.scene.stop("bare");
    run.advance(16);

    run.game.scale.resize(300, 200);

    expect(listener).not.toHaveBeenCalled();
    run.destroy();
  });
});

describe("onContextRestored", () => {
  it("calls the listener when a lost context is restored", async () => {
    const run = await runBare();
    const renderer = giveRenderer(run.scene);
    const listener = vi.fn();
    onContextRestored(run.scene, listener);

    renderer.emit("restorewebgl");

    expect(listener).toHaveBeenCalledOnce();
    run.destroy();
  });

  it("stops once the scene has ended", async () => {
    const run = await runBare();
    const renderer = giveRenderer(run.scene);
    const listener = vi.fn();
    onContextRestored(run.scene, listener);
    run.destroy();

    renderer.emit("restorewebgl");

    expect(listener).not.toHaveBeenCalled();
  });

  it("does nothing in a game with no renderer", async () => {
    const run = await runBare();

    expect(() => {
      onContextRestored(run.scene, vi.fn());
    }).not.toThrow();
    run.destroy();
  });
});

describe("onFirstFrame", () => {
  it("calls the listener once, after the first frame", async () => {
    const run = await runBare();
    const listener = vi.fn();
    onFirstFrame(run.scene, listener);
    const before = listener.mock.calls.length;

    run.advance(48);

    expect([before, listener.mock.calls.length]).toEqual([0, 1]);
    run.destroy();
  });

  it("forgets the listener when the scene ends before a frame", async () => {
    const run = await runBare();
    const listener = vi.fn();
    onFirstFrame(run.scene, listener);
    run.game.scene.stop("bare");
    run.advance(16);

    run.game.scene.start("bare");
    run.advance(16);

    expect(listener).not.toHaveBeenCalled();
    run.destroy();
  });
});

describe("pixelRatioOf", () => {
  /** Returns a scene whose scale manager reports a display scale. */
  function sceneAt(x: number | undefined): Scene {
    // Only the scale manager is read.
    return { scale: { displayScale: { x } } } as unknown as Scene;
  }

  it("reads the display scale the canvas renders at", () => {
    expect(pixelRatioOf(sceneAt(2.625))).toBe(2.625);
  });

  it.each([undefined, 0, Number.POSITIVE_INFINITY])(
    "falls back to 1 before the canvas is sized (%s)",
    (x) => {
      expect(pixelRatioOf(sceneAt(x))).toBe(1);
    },
  );

  it("reads 1 on a headless game's canvas, sized at 1 to 1", async () => {
    const run = await runBare();

    expect(pixelRatioOf(run.scene)).toBe(1);
    run.destroy();
  });
});
