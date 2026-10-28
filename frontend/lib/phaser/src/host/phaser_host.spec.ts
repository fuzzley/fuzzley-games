import { HEADLESS, Scene, type Types } from "phaser";
import type { Insets } from "../insets";
import {
  type HostOptions,
  type HostedGame,
  type HostedScene,
  type MakeScene,
  PhaserHost,
  type SceneSurroundings,
} from "./phaser_host";

/** Stands in for the `WEBGL_lose_context` extension of a context. */
class FakeLoseContext {
  /** How many times the context has been released. */
  losses = 0;

  loseContext(): void {
    this.losses++;
  }
}

/** Stands in for a game's scene manager, recording what it was told to do. */
class FakeSceneManager {
  /** Every operation, in order, as `<op>:<key>`. */
  readonly operations: string[] = [];
  /** The keys of the scenes added and not yet removed. */
  readonly mounted: string[] = [];

  add(key: string, _scene: HostedScene, autoStart: boolean): void {
    this.operations.push(`add:${key}`);
    if (autoStart) this.mounted.push(key);
  }

  stop(key: string): void {
    this.operations.push(`stop:${key}`);
  }

  remove(key: string): void {
    this.operations.push(`remove:${key}`);
    this.mounted.splice(this.mounted.indexOf(key), 1);
  }
}

/**
 * Stands in for a `Phaser.Game`, which, like the real one, boots
 * asynchronously and is only marked for destruction until its next frame tears
 * it down.
 */
class FakeGame implements HostedGame {
  readonly canvas = { style: { width: "", height: "" } };
  readonly scale = { setZoom: vi.fn(), resize: vi.fn(), refresh: vi.fn() };
  readonly scene = new FakeSceneManager();
  readonly loseContext = new FakeLoseContext();
  readonly renderer: HostedGame["renderer"];
  private readonly listeners = new Map<string, (() => void)[]>();
  /** Whether the host has asked for the game to be destroyed. */
  destroyed = false;

  /**
   * Creates a game from its config, drawing through WebGL, or through a
   * canvas renderer, which has no context to release.
   */
  constructor(
    readonly config: Types.Core.GameConfig,
    webgl = true,
  ) {
    const gl = {
      getExtension: (name: string) =>
        name === "WEBGL_lose_context" ? this.loseContext : null,
    } as unknown as WebGLRenderingContext;
    this.renderer = webgl ? { type: 2, gl } : { type: 1 };
  }

  readonly events = {
    once: (event: string, listener: () => void) => {
      this.listeners.set(event, [
        ...(this.listeners.get(event) ?? []),
        listener,
      ]);
    },
  };

  destroy(): void {
    this.destroyed = true;
  }

  /** Finishes booting, as the real game does once its textures are ready. */
  boot(): void {
    this.emit("ready");
  }

  /** Runs the next frame, which tears down a game marked for destruction. */
  step(): void {
    if (this.destroyed) this.emit("destroy");
  }

  private emit(event: string): void {
    const listeners = this.listeners.get(event) ?? [];
    this.listeners.delete(event);
    for (const listener of listeners) listener();
  }
}

/** A scene with a key no other shares, as a host needs. */
class KeyedScene extends Scene implements HostedScene {
  private static built = 0;

  readonly key: string;

  constructor() {
    const key = `scene-${++KeyedScene.built}`;
    super(key);
    this.key = key;
  }
}

/** The options a host is made with when a spec doesn't say. */
const OPTIONS: HostOptions = { title: "Snake", background: "#102030" };

describe("PhaserHost", () => {
  let games: FakeGame[];
  let webgl: boolean;

  /** Returns a host whose games are fakes, and records them. */
  function hostOn(
    parent = document.createElement("div"),
    options = OPTIONS,
  ): PhaserHost {
    return new PhaserHost(window, parent, options, (config) => {
      const created = new FakeGame(config, webgl);
      games.push(created);
      return created;
    });
  }

  let host: PhaserHost;

  beforeEach(() => {
    games = [];
    webgl = true;
    host = hostOn();
  });

  /** Returns the one game the host has started. */
  function game(): FakeGame {
    if (games.length !== 1) {
      throw new Error(`Expected one game, found ${games.length}`);
    }
    return games[0]!;
  }

  /** Shows a scene and returns it, once it has been built. */
  function show(on = host, onReady?: () => void): () => KeyedScene | undefined {
    let built: KeyedScene | undefined;
    on.show(() => {
      built = new KeyedScene();
      return built;
    }, onReady);
    return () => built;
  }

  /** Shows a scene, and returns what it is told of its surroundings. */
  function surroundingsOf(
    on: PhaserHost,
    onReady?: () => void,
  ): () => SceneSurroundings | undefined {
    let told: SceneSurroundings | undefined;
    const make: MakeScene = (surroundings) => {
      told = surroundings;
      return new KeyedScene();
    };
    on.show(make, onReady);
    return () => told;
  }

  describe("the game's config", () => {
    it("names the game and fills the canvas with the background", () => {
      show();

      expect(game().config).toMatchObject({
        title: "Snake",
        backgroundColor: "#102030",
      });
    });

    it("leaves a transparent canvas to show the page behind it", () => {
      show(hostOn(undefined, { title: "Snake", background: "transparent" }));

      expect({
        transparent: game().config.transparent,
        background: game().config.backgroundColor,
      }).toEqual({ transparent: true, background: undefined });
    });

    it("keeps its defaults where the game sets nothing", () => {
      show();

      expect(game().config).toMatchObject({
        autoFocus: true,
        render: { antialias: true, roundPixels: true },
      });
    });

    it("takes what the game sets over its defaults, its render merged", () => {
      show(
        hostOn(undefined, {
          ...OPTIONS,
          config: { autoFocus: false, render: { roundPixels: false } },
        }),
      );

      expect(game().config).toMatchObject({
        autoFocus: false,
        render: { antialias: true, roundPixels: false },
      });
    });
  });

  it("tells a scene the inset its parent declares", () => {
    const parent = document.createElement("div");
    parent.style.setProperty("--fz-canvas-inset-top", "40px");
    const surroundings = surroundingsOf(hostOn(parent));

    game().boot();

    expect(surroundings()?.insets().top).toBe(40);
  });

  it("tells a scene no insets before the game has measured its canvas", () => {
    let insets: (() => Insets) | undefined;
    const scene = new KeyedScene();
    host.show((surroundings) => {
      insets = surroundings.insets;
      return scene;
    });
    game().boot();
    host.destroy();

    expect(insets?.()).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it("reads the insets again when asked, without the window resizing", () => {
    const parent = document.createElement("div");
    // In the document, since jsdom keeps a detached element's computed style.
    document.body.append(parent);
    parent.style.setProperty("--fz-canvas-inset-left", "64px");
    const railed = hostOn(parent);
    const surroundings = surroundingsOf(railed);
    game().boot();
    // The rail moves to the other edge, as a change of hand moves it.
    parent.style.setProperty("--fz-canvas-inset-left", "0px");
    parent.style.setProperty("--fz-canvas-inset-right", "64px");

    railed.refreshInsets();
    parent.remove();

    const insets = surroundings()?.insets();
    expect([insets?.left, insets?.right]).toEqual([0, 64]);
  });

  describe("ready", () => {
    it("is passed on when the scene on the canvas says it has drawn", () => {
      const onReady = vi.fn();
      const surroundings = surroundingsOf(host, onReady);
      game().boot();

      surroundings()?.ready();

      expect(onReady).toHaveBeenCalledOnce();
    });

    it("is dropped from a scene already replaced", () => {
      const onReady = vi.fn();
      const surroundings = surroundingsOf(host, onReady);
      game().boot();
      show();

      surroundings()?.ready();

      expect(onReady).not.toHaveBeenCalled();
    });

    it("may go unheard", () => {
      const surroundings = surroundingsOf(host);
      game().boot();

      expect(() => surroundings()?.ready()).not.toThrow();
    });
  });

  describe("show", () => {
    it("starts one game however many scenes it shows", () => {
      show();
      games[0]?.boot();

      show();
      show();

      expect(games).toHaveLength(1);
    });

    it("mounts nothing until the game has booted", () => {
      show();

      expect(game().scene.mounted).toEqual([]);
    });

    it("mounts the scene once the game has booted", () => {
      const scene = show();

      game().boot();

      expect(game().scene.mounted).toEqual([scene()?.key]);
    });

    it("replaces the scene on the canvas with the next one", () => {
      show();
      game().boot();

      const next = show();

      expect(game().scene.mounted).toEqual([next()?.key]);
    });

    it("stops the scene it replaces before removing it", () => {
      const first = show();
      game().boot();
      const key = first()?.key;

      show();

      // Phaser destroys a removed scene without shutting it down.
      expect(
        game().scene.operations.filter((op) => op.endsWith(`:${key}`)),
      ).toEqual([`add:${key}`, `stop:${key}`, `remove:${key}`]);
    });

    it("builds only the latest scene shown while the game boots", () => {
      const first = show();
      const second = show();

      game().boot();

      expect({
        firstBuilt: first() !== undefined,
        mounted: game().scene.mounted,
      }).toEqual({ firstBuilt: false, mounted: [second()?.key] });
    });

    it("mounts nothing when the game finishes booting after it was destroyed", () => {
      show();
      host.destroy();

      game().boot();

      expect(game().scene.mounted).toEqual([]);
    });
  });

  describe("on a real Phaser game", () => {
    it("boots the game and starts the scene it is shown", async () => {
      const parent = document.createElement("div");
      document.body.append(parent);
      const real = new PhaserHost(window, parent, {
        title: "Snake",
        background: "transparent",
        config: { type: HEADLESS, autoFocus: false, banner: false },
      });
      const created = new Promise<void>((resolve) => {
        real.show(
          () =>
            new (class extends KeyedScene {
              create(): void {
                resolve();
              }
            })(),
        );
      });

      await expect(created).resolves.toBeUndefined();
      real.destroy();
      parent.remove();
    });
  });

  describe("destroy", () => {
    it("destroys the game it started", () => {
      show();

      host.destroy();

      expect(game().destroyed).toBe(true);
    });

    it("releases the game's WebGL context once Phaser tears the game down", () => {
      show();
      host.destroy();

      game().step();

      expect(game().loseContext.losses).toBe(1);
    });

    it("keeps the context until then, while the renderer still listens for its loss", () => {
      show();

      host.destroy();

      expect(game().loseContext.losses).toBe(0);
    });

    it("releases the context only once when destroyed twice", () => {
      show();
      host.destroy();
      host.destroy();

      game().step();

      expect(game().loseContext.losses).toBe(1);
    });

    it("tears down a game drawn without WebGL", () => {
      webgl = false;
      show();
      host.destroy();

      game().step();

      expect(game().destroyed).toBe(true);
    });

    it("does nothing for a host that never showed a scene", () => {
      host.destroy();

      expect(games).toEqual([]);
    });
  });
});
