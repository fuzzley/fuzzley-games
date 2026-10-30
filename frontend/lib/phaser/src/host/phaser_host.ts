import * as Phaser from "phaser";
import type { Scene, Types } from "phaser";
import { type Insets, NO_INSETS } from "../insets";
import { ViewportScaler } from "./viewport_scaler";

/** Describes a scene a host runs: a Phaser scene with a key of its own. */
export interface HostedScene extends Scene {
  /**
   * The key the scene is added under, which no other scene in the game
   * shares, since Phaser throws on a key already in use.
   */
  readonly key: string;
}

/** Says what a scene may ask of the page around its canvas. */
export interface SceneSurroundings {
  /**
   * Returns how far in from each edge the app's chrome lies over the canvas,
   * in CSS pixels, as the canvas's parent declares it in
   * `--fz-canvas-inset-top`, `-right`, `-bottom` and `-left`.
   */
  readonly insets: () => Insets;
  /** Says the scene has drawn its first frame. */
  readonly ready: () => void;
}

/** Builds a scene to run in a host. */
export type MakeScene = (surroundings: SceneSurroundings) => HostedScene;

/** Says how a host sets up its game. */
export interface HostOptions {
  /** Names the game in Phaser's config. */
  readonly title: string;
  /**
   * Fills the canvas until a scene draws over it: a color, or "transparent",
   * which shows the page behind the canvas.
   */
  readonly background: string;
  /**
   * Overrides Phaser's config, but for what the host sets itself. The
   * defaults are `type: AUTO`, `autoFocus` and `render` with `antialias` and
   * `roundPixels`; a game's `render` is merged into the default one.
   */
  readonly config?: Omit<
    Types.Core.GameConfig,
    | "parent"
    | "scale"
    | "scene"
    | "title"
    | "backgroundColor"
    | "transparent"
    | "canvasStyle"
  >;
}

/** Builds the game a host runs from its configuration. */
export type CreateGame = (config: Types.Core.GameConfig) => Phaser.Game;

/** Builds a Phaser game. */
const createPhaserGame: CreateGame = (config) => new Phaser.Game(config);

/**
 * Describes a scene waiting to be mounted: how to build it, what to tell once
 * it draws, and how to settle the `show()` that asked for it.
 */
interface PendingScene {
  readonly make: MakeScene;
  readonly onReady?: (() => void) | undefined;
  /** Settles the `show()` once the scene is mounted, or will never be. */
  readonly resolve: () => void;
  /** Settles the `show()` with what kept the scene from being mounted. */
  readonly reject: (error: unknown) => void;
}

/**
 * Hosts one Phaser game, and so one WebGL context, for as long as it lives,
 * swapping in whichever scene it is shown.
 *
 * Keeping the game means a new scene reuses the context, its compiled shaders
 * and the textures already uploaded, and a browser never has to drop an old
 * context to make room for a new one.
 */
export class PhaserHost {
  private game?: Phaser.Game;

  /** Keeps the canvas sized to the display's true pixel resolution. */
  private scaler?: ViewportScaler;

  /** Whether the game has booted, after which a scene is swapped in at once. */
  private booted = false;

  /** The scene on the canvas. */
  private scene?: HostedScene;

  /** The scene to mount once the game has booted. */
  private pending?: PendingScene;

  /** What kept the game's canvas from being sized as it booted, if anything did. */
  private bootError?: Error;

  /** Creates a host that mounts a canvas into `parent` when first shown a scene. */
  constructor(
    private readonly window: Window,
    private readonly parent: HTMLElement,
    private readonly options: HostOptions,
    private readonly createGame: CreateGame = createPhaserGame,
  ) {}

  /**
   * Replaces the scene on the canvas with the one `make` builds, starting the
   * game first if need be, and calls `onReady` once that scene says it has
   * drawn its first frame.
   *
   * Resolves once the scene is mounted, or once another shown before the
   * game booted, or the host's end, means it never will be; rejects with what
   * went wrong if building or mounting it threw, or the canvas couldn't be
   * sized as the game booted. A scene that loads files creates itself only
   * once they have loaded, after this has resolved, so what its `create()`
   * throws then isn't caught here.
   *
   * A scene shown before the game has booted replaces any other still
   * waiting, so only the latest is ever built.
   */
  show(make: MakeScene, onReady?: () => void): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.bootError) {
        reject(this.bootError);
        return;
      }
      const pending = { make, onReady, resolve, reject };
      if (this.game && this.booted) {
        this.mount(this.game, pending);
        return;
      }
      this.pending?.resolve();
      this.pending = pending;
      if (!this.game) this.start();
    });
  }

  /** Starts the game, which mounts the waiting scene once it has booted. */
  private start(): void {
    const { title, background, config } = this.options;
    const gameConfig: Types.Core.GameConfig = {
      type: Phaser.AUTO,
      autoFocus: true,
      ...config,
      title,
      parent: this.parent,
      ...(background === "transparent"
        ? { transparent: true }
        : { backgroundColor: background }),
      scale: {
        // ViewportScaler sizes the canvas in device pixels; every built-in mode
        // would use CSS pixels.
        mode: Phaser.Scale.ScaleModes.NONE,
      },
      render: {
        antialias: true,
        roundPixels: true,
        ...config?.render,
      },
      canvasStyle: `display: block; width: 100%; height: 100%;`,
    };
    const game = this.createGame(gameConfig);
    this.game = game;

    // The scale manager and canvas only exist once the game has booted.
    game.events.once(Phaser.Core.Events.READY, () => {
      // A game destroyed while booting may still finish booting.
      if (this.game !== game) return;
      this.booted = true;
      const pending = this.pending;
      this.pending = undefined;
      // Phaser starts the game's loop only once this listener returns, so
      // nothing thrown here may escape it.
      try {
        const scaler = new ViewportScaler(this.window, game, this.parent);
        scaler.start();
        this.scaler = scaler;
      } catch (error) {
        this.bootError =
          error instanceof Error
            ? error
            : new Error("The canvas couldn't be sized", { cause: error });
        pending?.reject(this.bootError);
        return;
      }
      if (pending) this.mount(game, pending);
    });
  }

  /**
   * Builds a scene and swaps it in for the one on the canvas, which stays if
   * the new one can't be built, and settles the `show()` that asked for it.
   */
  private mount(game: Phaser.Game, pending: PendingScene): void {
    const scenes = game.scene;
    try {
      const scene = pending.make({
        insets: () => this.scaler?.insets ?? NO_INSETS,
        ready: () => {
          // A scene replaced before its first frame has nothing to report.
          if (this.scene === scene) pending.onReady?.();
        },
      });
      if (this.scene) {
        // Stopped before it is removed, because removing a scene destroys it
        // without shutting it down.
        scenes.stop(this.scene.key);
        scenes.remove(this.scene.key);
      }
      this.scene = scene;
      scenes.add(scene.key, scene, true);
    } catch (error) {
      pending.reject(error);
      return;
    }
    pending.resolve();
  }

  /**
   * Reads again how far in the chrome lies over each edge of the canvas, for
   * chrome that moved without the window changing size, such as a rail that
   * changed sides. The scene lays itself out inside the new insets on its next
   * frame.
   */
  refreshInsets(): void {
    this.scaler?.refreshInsets();
  }

  /**
   * Tears the game down, releasing the scaler's listeners, the canvas and its
   * WebGL context.
   */
  destroy(): void {
    this.scaler?.stop();
    this.scaler = undefined;
    this.scene = undefined;
    this.pending?.resolve();
    this.pending = undefined;
    this.booted = false;
    const game = this.game;
    if (!game) return;
    this.game = undefined;

    // Phaser leaves the context for the garbage collector, and a browser caps
    // how many it keeps alive. Released from Phaser's own teardown, which runs
    // on the next frame, because its renderer warns of a lost context until
    // then.
    game.events.once(Phaser.Core.Events.DESTROY, () => {
      const renderer = game.renderer;
      if (renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
        renderer.gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
    });
    game.destroy(true);
  }
}
