import { Cameras, Scene } from "phaser";
import type { HostedScene, SceneSurroundings } from "../host";
import { type SceneRun, runScene } from "../testing";
import {
  onContextRestored,
  onFirstFrame,
  onPlayerAway,
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
    const listener = vi.fn();
    onContextRestored(run.scene, listener);
    await run.loseContext();

    await run.restoreContext();

    expect(listener).toHaveBeenCalledOnce();
    run.destroy();
  });

  it("waits for the context to come back", async () => {
    const run = await runBare();
    const listener = vi.fn();
    onContextRestored(run.scene, listener);

    await run.loseContext();

    expect(listener).not.toHaveBeenCalled();
    run.destroy();
  });

  it("stops once the scene has ended", async () => {
    const run = await runBare();
    const listener = vi.fn();
    onContextRestored(run.scene, listener);
    run.game.scene.stop("bare");
    run.advance(16);
    await run.loseContext();

    await run.restoreContext();

    expect(listener).not.toHaveBeenCalled();
    run.destroy();
  });
});

describe("onPlayerAway", () => {
  let run: SceneRun<BareScene> | null = null;
  let board: HTMLElement | null = null;
  let outside: HTMLElement | null = null;

  /**
   * Runs a bare scene whose keyboard listens on a board of the page, or on
   * the window, and has it count the times the player looked away.
   */
  async function followAway(onBoard = true): Promise<{ away: () => number }> {
    let looked = 0;
    board = document.createElement("div");
    document.body.append(board);
    const target = onBoard ? board : window;
    run = await runScene((surroundings) => new BareScene(surroundings), {
      config: { input: { keyboard: { target } } },
    });
    onPlayerAway(run.scene, () => {
      looked++;
    });
    return { away: () => looked };
  }

  /** Returns a button on the page, outside the board. */
  function buttonOutside(): HTMLElement {
    outside = document.createElement("button");
    document.body.append(outside);
    return outside;
  }

  /** Moves the focus off the board, to an element or to nothing. */
  function leaveBoard(to: Element | null): void {
    board?.dispatchEvent(
      new FocusEvent("focusout", { relatedTarget: to, bubbles: true }),
    );
  }

  /** Hides the page, as a browser does when its tab is put away. */
  function hidePage(): void {
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    document.dispatchEvent(new Event("visibilitychange"));
  }

  afterEach(() => {
    run?.destroy();
    run = null;
    board?.remove();
    board = null;
    outside?.remove();
    outside = null;
    vi.restoreAllMocks();
  });

  it("calls the listener as the window loses the focus", async () => {
    const { away } = await followAway();

    window.dispatchEvent(new Event("blur"));

    expect(away()).toBe(1);
  });

  it("calls the listener as the page is hidden", async () => {
    const { away } = await followAway();

    hidePage();

    expect(away()).toBe(1);
  });

  it("calls the listener as the focus leaves the board for the page", async () => {
    const { away } = await followAway();

    leaveBoard(buttonOutside());

    expect(away()).toBe(1);
  });

  it("calls the listener as the focus leaves the board for nothing", async () => {
    const { away } = await followAway();

    leaveBoard(null);

    expect(away()).toBe(1);
  });

  it("stays quiet as the focus moves within the board", async () => {
    const { away } = await followAway();
    const button = document.createElement("button");
    board?.append(button);

    leaveBoard(button);

    expect(away()).toBe(0);
  });

  it("follows the window where the keyboard listens on no element", async () => {
    const { away } = await followAway(false);

    window.dispatchEvent(new Event("blur"));
    leaveBoard(null);

    expect(away()).toBe(1);
  });

  it("stops once the scene has ended", async () => {
    const { away } = await followAway();
    run?.game.scene.stop("bare");
    run?.advance(16);

    window.dispatchEvent(new Event("blur"));
    hidePage();
    leaveBoard(null);

    expect(away()).toBe(0);
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

  it("calls the listener once the scene's camera has drawn", async () => {
    const run = await runBare();
    const heard: string[] = [];
    onFirstFrame(run.scene, () => heard.push("ready"));
    run.scene.cameras.main.once(Cameras.Scene2D.Events.POST_RENDER, () =>
      heard.push("drawn"),
    );

    run.advance(16);

    expect(heard).toEqual(["drawn", "ready"]);
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

  it("reads 1 on the harness's canvas, sized at 1 to 1", async () => {
    const run = await runBare();

    expect(pixelRatioOf(run.scene)).toBe(1);
    run.destroy();
  });
});
