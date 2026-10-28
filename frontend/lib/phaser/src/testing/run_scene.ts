import type { Game, Types } from "phaser";
import type { HostedScene, SceneSurroundings } from "../host";
import { type Insets, NO_INSETS } from "../insets";

/** Says how {@link runScene} sets up the game a scene runs in. */
export interface SceneRunOptions {
  /** The canvas's width, in pixels; 400 when not given. */
  readonly width?: number;
  /** The canvas's height, in pixels; 400 when not given. */
  readonly height?: number;
  /** What the scene is told the app's chrome covers; nothing when not given. */
  readonly insets?: Insets;
  /** Phaser's config, beyond what the harness sets, such as `input`. */
  readonly config?: Omit<
    Types.Core.GameConfig,
    "type" | "parent" | "width" | "height" | "scene"
  >;
}

/**
 * A scene running in a WebGL game that draws nothing, whose frames a spec
 * steps by hand.
 */
export interface SceneRun<S extends HostedScene> {
  /** The game the scene runs in. */
  readonly game: Game;
  /** The scene, created and running. */
  readonly scene: S;
  /** Whether the scene has said it drew its first frame. */
  readonly ready: boolean;
  /**
   * Steps the game `ms` forward, a frame of `frameMs` at a time, moving the
   * clock Phaser's tweens read with it.
   */
  advance(ms: number, frameMs?: number): void;
  /**
   * Sends a key event to the element Phaser's keyboard listens on. Phaser
   * hears it on the next frame, so {@link advance} after it.
   */
  key(type: "keydown" | "keyup", code: string, key?: string): void;
  /**
   * Sends a mouse event to the canvas, at a point in its pixels. Phaser hears
   * it at once.
   */
  pointer(type: "down" | "move" | "up", x: number, y: number): void;
  /**
   * Loses the game's WebGL context, as a browser may, through the context's
   * own `WEBGL_lose_context`; Phaser hears it at once.
   */
  loseContext(): void;
  /** Restores the context {@link loseContext} lost; Phaser hears it at once. */
  restoreContext(): void;
  /** Destroys the game, and with it the scene. */
  destroy(): void;
}

/** How long a scene may take to start before {@link runScene} gives up. */
const START_TIMEOUT_MS = 5_000;

/**
 * Runs a scene in a WebGL game, for a spec to step frame by frame: real
 * Phaser, its renderer included, drawing on a context that draws nothing.
 *
 * Call {@link installHeadlessPhaser} first, from the test setup. A spec
 * asserts on the scene's game objects, never on pixels, and fakes no `Date`:
 * the harness moves the clock Phaser's tweens read itself.
 */
export async function runScene<S extends HostedScene>(
  make: (surroundings: SceneSurroundings) => S,
  options: SceneRunOptions = {},
): Promise<SceneRun<S>> {
  // Imported here, so a test setup can import this entry before it installs
  // what Phaser needs to load in jsdom.
  const { Core, Game, Scenes, WEBGL } = await import("phaser");
  const { width = 400, height = 400, insets = NO_INSETS } = options;
  const parent = document.createElement("div");
  document.body.append(parent);
  const game = new Game({
    banner: false,
    autoFocus: false,
    audio: { noAudio: true },
    ...options.config,
    type: WEBGL,
    parent,
    width,
    height,
  });
  await new Promise<void>((resolve) => {
    game.events.once(Core.Events.READY, () => {
      resolve();
    });
  });
  // jsdom measures every element as 0 × 0, and Phaser maps the pointer
  // through the size of the canvas.
  game.canvas.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width,
      height,
      right: width,
      bottom: height,
    }) as DOMRect;
  game.scale.refresh();

  let ready = false;
  const scene = make({
    insets: () => insets,
    ready: () => {
      ready = true;
    },
  });
  game.scene.add(scene.key, scene, true);
  await started(scene, Scenes.RUNNING);
  game.loop.sleep();

  let time = game.loop.time;
  let wall = Date.now();
  const now = Object.getOwnPropertyDescriptor(Date, "now");

  return {
    game,
    scene,
    get ready() {
      return ready;
    },
    advance(ms, frameMs = 16) {
      Object.defineProperty(Date, "now", {
        configurable: true,
        writable: true,
        value: () => wall,
      });
      try {
        for (let passed = 0; passed < ms; passed += frameMs) {
          const delta = Math.min(frameMs, ms - passed);
          time += delta;
          wall += delta;
          game.step(time, delta);
        }
      } finally {
        if (now) Object.defineProperty(Date, "now", now);
      }
    },
    key(type, code, key = code) {
      const target = (game.input.keyboard?.target ?? window) as EventTarget;
      target.dispatchEvent(
        new KeyboardEvent(type, { code, key, bubbles: true, cancelable: true }),
      );
    },
    pointer(type, x, y) {
      game.canvas.dispatchEvent(
        new MouseEvent(`mouse${type}`, {
          clientX: x,
          clientY: y,
          button: 0,
          buttons: type === "up" ? 0 : 1,
          bubbles: true,
          cancelable: true,
        }),
      );
    },
    loseContext() {
      loseContextOf(game).loseContext();
    },
    restoreContext() {
      loseContextOf(game).restoreContext();
    },
    destroy() {
      game.destroy(true);
      // Phaser tears a game down on its next frame, which only a step brings
      // while the loop sleeps.
      game.step(time, 0);
      parent.remove();
    },
  };
}

/** Returns the WebGL context's own means of losing and restoring itself. */
function loseContextOf(game: Game): WEBGL_lose_context {
  const context = game.canvas.getContext("webgl");
  const extension = context?.getExtension("WEBGL_lose_context");
  if (!extension) throw new Error("The game's canvas has no WebGL context");
  return extension;
}

/** Waits for a scene to start running, which a scene that loads files takes a while to. */
async function started(scene: HostedScene, running: number): Promise<void> {
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (scene.sys.settings.status < running) {
    if (Date.now() > deadline) {
      throw new Error(`Scene "${scene.key}" didn't start`);
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
