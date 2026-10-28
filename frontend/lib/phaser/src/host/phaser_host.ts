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

/** The scene waiting for the game to boot, and what to tell once it draws. */
interface PendingScene {
  readonly make: MakeScene;
  readonly onReady?: (() => void) | undefined;
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
   * A scene shown before the game has booted replaces any other still
   * waiting, so only the latest is ever built.
   */
  public show(make: MakeScene, onReady?: () => void): void {
    const pending = { make, onReady };
    if (this.game && this.booted) {
      this.mount(this.game, pending);
      return;
    }
    this.pending = pending;
    if (!this.game) this.start();
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
      this.scaler = new ViewportScaler(this.window, game, this.parent);
      this.scaler.start();
      if (this.pending) this.mount(game, this.pending);
    });
  }

  /** Swaps a scene in for the one on the canvas. */
  private mount(game: Phaser.Game, pending: PendingScene): void {
    this.pending = undefined;
    const scenes = game.scene;
    if (this.scene) {
      // Stopped before it is removed, because removing a scene destroys it
      // without shutting it down.
      scenes.stop(this.scene.key);
      scenes.remove(this.scene.key);
    }
    const scene = pending.make({
      insets: () => this.scaler?.insets ?? NO_INSETS,
      ready: () => {
        // A scene replaced before its first frame has nothing to report.
        if (this.scene === scene) pending.onReady?.();
      },
    });
    this.scene = scene;
    scenes.add(scene.key, scene, true);
  }

  /**
   * Reads again how far in the chrome lies over each edge of the canvas, for
   * chrome that moved without the window changing size, such as a rail that
   * changed sides. The scene lays itself out inside the new insets on its next
   * frame.
   */
  public refreshInsets(): void {
    this.scaler?.refreshInsets();
  }

  /**
   * Tears the game down, releasing the scaler's listeners, the canvas and its
   * WebGL context.
   */
  public destroy(): void {
    this.scaler?.stop();
    this.scaler = undefined;
    this.scene = undefined;
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
