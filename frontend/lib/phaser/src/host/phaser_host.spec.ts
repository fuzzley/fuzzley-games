import { CANVAS, Core, Game, Scene, Scenes, type Types } from "phaser";
import type { Insets } from "../insets";
import {
  type HostOptions,
  type HostedScene,
  type MakeScene,
  PhaserHost,
  type SceneSurroundings,
} from "./phaser_host";

/** A scene with a key no other shares, as a host needs, that records its life. */
class KeyedScene extends Scene implements HostedScene {
  private static built = 0;

  readonly key: string;
  /** What has happened to the scene, in order. */
  readonly life: string[] = [];

  constructor() {
    const key = `scene-${++KeyedScene.built}`;
    super(key);
    this.key = key;
  }

  create(): void {
    this.life.push("create");
    this.events.once(Scenes.Events.SHUTDOWN, () => this.life.push("shutdown"));
    this.events.once(Scenes.Events.DESTROY, () => this.life.push("destroy"));
  }
}

/** A game a host started, and when it booted and was torn down. */
interface StartedGame {
  readonly game: Game;
  readonly config: Types.Core.GameConfig;
  readonly booted: Promise<void>;
  readonly tornDown: Promise<void>;
}

/** The options a host is made with when a spec doesn't say. */
const OPTIONS: HostOptions = {
  title: "Snake",
  background: "#102030",
  config: { banner: false, audio: { noAudio: true } },
};

/** Resolves once a game has raised an event. */
async function heard(game: Game, event: string): Promise<void> {
  await new Promise<void>((resolve) => {
    game.events.once(event, () => {
      resolve();
    });
  });
}

describe("PhaserHost", () => {
  let started: StartedGame[];
  let hosts: PhaserHost[];
  let parents: HTMLElement[];
  let host: PhaserHost;

  /** Returns a parent in the page, removed after the spec. */
  function attached(): HTMLElement {
    const parent = document.createElement("div");
    document.body.append(parent);
    parents.push(parent);
    return parent;
  }

  /** Returns a host that records each real game it starts. */
  function hostOn(parent = attached(), options = OPTIONS): PhaserHost {
    const made = new PhaserHost(window, parent, options, (config) => {
      const game = new Game(config);
      started.push({
        game,
        config,
        booted: heard(game, Core.Events.READY),
        tornDown: heard(game, Core.Events.DESTROY),
      });
      return game;
    });
    hosts.push(made);
    return made;
  }

  beforeEach(() => {
    started = [];
    hosts = [];
    parents = [];
    host = hostOn();
  });

  afterEach(async () => {
    for (const each of hosts) each.destroy();
    await Promise.all(started.map(({ tornDown }) => tornDown));
    for (const parent of parents) parent.remove();
  });

  /** Returns the one game the host has started. */
  function only(): StartedGame {
    if (started.length !== 1) {
      throw new Error(`Expected one game, found ${started.length}`);
    }
    return started[0]!;
  }

  /** Returns the keys of the scenes in the one game. */
  function mounted(): string[] {
    return only()
      .game.scene.getScenes(false)
      .map((scene) => scene.sys.settings.key);
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

      expect(only().config).toMatchObject({
        title: "Snake",
        backgroundColor: "#102030",
      });
    });

    it("leaves a transparent canvas to show the page behind it", () => {
      show(hostOn(undefined, { ...OPTIONS, background: "transparent" }));

      expect({
        transparent: only().config.transparent,
        background: only().config.backgroundColor,
      }).toEqual({ transparent: true, background: undefined });
    });

    it("keeps its defaults where the game sets nothing", () => {
      show();

      expect(only().config).toMatchObject({
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

      expect(only().config).toMatchObject({
        autoFocus: false,
        render: { antialias: true, roundPixels: false },
      });
    });
  });

  it("boots a game of its own when given no way to make one", async () => {
    const parent = attached();
    const real = new PhaserHost(window, parent, OPTIONS);
    hosts.push(real);
    const created = new Promise<void>((resolve) => {
      real.show(
        () =>
          new (class extends KeyedScene {
            override create(): void {
              resolve();
            }
          })(),
      );
    });

    await expect(created).resolves.toBeUndefined();
    real.destroy();
  });

  it("tells a scene the inset its parent declares", async () => {
    const parent = attached();
    parent.style.setProperty("--fz-canvas-inset-top", "40px");
    const surroundings = surroundingsOf(hostOn(parent));

    await only().booted;

    expect(surroundings()?.insets().top).toBe(40);
  });

  it("tells a scene no insets before the game has measured its canvas", async () => {
    let insets: (() => Insets) | undefined;
    host.show((surroundings) => {
      insets = surroundings.insets;
      return new KeyedScene();
    });
    await only().booted;

    host.destroy();

    expect(insets?.()).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it("reads the insets again when asked, without the window resizing", async () => {
    const parent = attached();
    parent.style.setProperty("--fz-canvas-inset-left", "64px");
    const railed = hostOn(parent);
    const surroundings = surroundingsOf(railed);
    await only().booted;
    // The rail moves to the other edge, as a change of hand moves it.
    parent.style.setProperty("--fz-canvas-inset-left", "0px");
    parent.style.setProperty("--fz-canvas-inset-right", "64px");

    railed.refreshInsets();

    const insets = surroundings()?.insets();
    expect([insets?.left, insets?.right]).toEqual([0, 64]);
  });

  describe("ready", () => {
    it("is passed on when the scene on the canvas says it has drawn", async () => {
      const onReady = vi.fn();
      const surroundings = surroundingsOf(host, onReady);
      await only().booted;

      surroundings()?.ready();

      expect(onReady).toHaveBeenCalledOnce();
    });

    it("is dropped from a scene already replaced", async () => {
      const onReady = vi.fn();
      const surroundings = surroundingsOf(host, onReady);
      await only().booted;
      show();

      surroundings()?.ready();

      expect(onReady).not.toHaveBeenCalled();
    });

    it("may go unheard", async () => {
      const surroundings = surroundingsOf(host);
      await only().booted;

      expect(() => surroundings()?.ready()).not.toThrow();
    });
  });

  describe("show", () => {
    it("starts one game however many scenes it shows", async () => {
      show();
      await only().booted;

      show();
      show();

      expect(started).toHaveLength(1);
    });

    it("mounts nothing until the game has booted", () => {
      show();

      expect(mounted()).toEqual([]);
    });

    it("mounts the scene once the game has booted, and starts it", async () => {
      const scene = show();

      await only().booted;

      expect([mounted(), scene()?.life]).toEqual([[scene()?.key], ["create"]]);
    });

    it("replaces the scene on the canvas with the next one", async () => {
      show();
      await only().booted;

      const next = show();

      expect(mounted()).toEqual([next()?.key]);
    });

    it("shuts the scene it replaces down before removing it", async () => {
      const first = show();
      await only().booted;

      show();

      // Phaser destroys a removed scene without shutting it down.
      expect(first()?.life).toEqual(["create", "shutdown", "destroy"]);
    });

    it("builds only the latest scene shown while the game boots", async () => {
      const first = show();
      const second = show();

      await only().booted;

      expect({
        firstBuilt: first() !== undefined,
        mounted: mounted(),
      }).toEqual({ firstBuilt: false, mounted: [second()?.key] });
    });

    it("mounts nothing when the game finishes booting after it was destroyed", async () => {
      show();
      host.destroy();

      await only().booted;

      expect(mounted()).toEqual([]);
    });
  });

  describe("destroy", () => {
    it("tears down the game it started, and its canvas", async () => {
      show();
      await only().booted;

      host.destroy();
      await only().tornDown;

      expect(only().game.canvas.isConnected).toBe(false);
    });

    it("releases the game's WebGL context once Phaser tears the game down", async () => {
      show();
      await only().booted;
      const context = only().game.canvas.getContext("webgl");

      host.destroy();
      await only().tornDown;

      expect(context?.isContextLost()).toBe(true);
    });

    it("keeps the context until then, while the renderer still listens for its loss", async () => {
      show();
      await only().booted;
      const context = only().game.canvas.getContext("webgl");

      host.destroy();

      expect(context?.isContextLost()).toBe(false);
    });

    it("tears the game down once when destroyed twice", async () => {
      show();
      await only().booted;

      host.destroy();
      host.destroy();
      await only().tornDown;

      expect(only().game.canvas.isConnected).toBe(false);
    });

    it("tears down a game drawn without WebGL", async () => {
      const drawn = hostOn(undefined, {
        ...OPTIONS,
        config: { ...OPTIONS.config, type: CANVAS },
      });
      show(drawn);
      await only().booted;

      drawn.destroy();
      await only().tornDown;

      expect(only().game.canvas.isConnected).toBe(false);
    });

    it("does nothing for a host that never showed a scene", () => {
      host.destroy();

      expect(started).toEqual([]);
    });
  });
});
