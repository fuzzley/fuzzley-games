import type { Game, Types } from "phaser";
import type { HostedScene, SceneSurroundings } from "../host";
import { type Insets, NO_INSETS } from "../insets";
import { type FileServer, serveFrom } from "./served_files";
import { startGame, stopGame } from "./start_game";

/** Says how {@link runScene} sets up the game a scene runs in. */
export interface SceneRunOptions {
  /** The canvas's width, in pixels; 400 when not given. */
  readonly width?: number;
  /** The canvas's height, in pixels; 400 when not given. */
  readonly height?: number;
  /** What the scene is told the app's chrome covers; nothing when not given. */
  readonly insets?: Insets;
  /**
   * Answers the files the game asks for, until the run is destroyed; every
   * request is a 404 when not given. One run serves at a time.
   */
  readonly serve?: FileServer;
  /**
   * Readies the game before the scene is added, as an earlier scene may have
   * left it, such as with textures loaded.
   */
  readonly prepare?: (game: Game) => void | Promise<void>;
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
   * Sends a key event to the element Phaser's keyboard listens on, as a
   * browser sends it, with the key's `keyCode`. Phaser hears it on the next
   * frame, so {@link advance} after it.
   */
  key(type: "keydown" | "keyup", code: string, key?: string): void;
  /**
   * Sends a mouse event to the canvas, at a point in its pixels, or to an
   * element in the page over it, as a press on the page's own chrome reaches
   * Phaser through the window. Phaser hears it at once.
   */
  pointer(
    type: "down" | "move" | "up",
    x: number,
    y: number,
    on?: Element,
  ): void;
  /**
   * Sends a touch of one finger to the canvas, at a point in its pixels.
   * Phaser hears it at once.
   */
  touch(type: "start" | "move" | "end", x: number, y: number): void;
  /**
   * Resolves once the scene's loader has finished everything it was given,
   * each file loaded or failed, stepping a frame on each wait, as a browser's
   * frames go on while files load.
   */
  loaded(): Promise<void>;
  /**
   * Loses the game's WebGL context, as a browser may, through the context's
   * own `WEBGL_lose_context`, and resolves once Phaser has heard.
   */
  loseContext(): Promise<void>;
  /**
   * Restores the context {@link loseContext} lost, and resolves once Phaser
   * has heard.
   */
  restoreContext(): Promise<void>;
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
  const { Scenes } = await import("phaser");
  const { width = 400, height = 400, insets = NO_INSETS } = options;
  serveFrom(options.serve);
  const game = await startGame({ ...options.config, width, height });
  await options.prepare?.(game);

  let ready = false;
  const scene = make({
    insets: () => insets,
    ready: () => {
      ready = true;
    },
  });
  game.scene.add(scene.key, scene, true);
  await started(scene, Scenes.RUNNING);

  let time = game.loop.time;
  let wall = Date.now();
  let stamp = 0;
  const now = Object.getOwnPropertyDescriptor(Date, "now");

  const advance = (ms: number, frameMs = 16): void => {
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
  };

  return {
    game,
    scene,
    get ready() {
      return ready;
    },
    advance,
    key(type, code, key = code) {
      const target = (game.input.keyboard?.target ?? window) as EventTarget;
      const event = new KeyboardEvent(type, {
        code,
        key,
        keyCode: keyCodeOf(code),
        bubbles: true,
        cancelable: true,
      });
      // Phaser drops an event of the key and stamp of the one before it, which
      // jsdom stamps to the millisecond, and a browser to a fraction of one.
      stamp = Math.max(performance.now(), stamp + 0.001);
      Object.defineProperty(event, "timeStamp", { value: stamp });
      target.dispatchEvent(event);
    },
    pointer(type, x, y, on = game.canvas) {
      on.dispatchEvent(
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
    touch(type, x, y) {
      const canvas = game.canvas;
      const finger = {
        identifier: 0,
        target: canvas,
        clientX: x,
        clientY: y,
        pageX: x,
        pageY: y,
        screenX: x,
        screenY: y,
      };
      // jsdom has no Touch to build a TouchEvent from, and Phaser reads only
      // the lists of touches.
      const event = new Event(`touch${type}`, {
        bubbles: true,
        cancelable: true,
      });
      const down = type === "end" ? [] : [finger];
      Object.defineProperties(event, {
        changedTouches: { value: [finger] },
        touches: { value: down },
        targetTouches: { value: down },
      });
      canvas.dispatchEvent(event);
    },
    async loaded() {
      while (scene.load.isLoading()) {
        await nextTask();
        // Phaser takes in a file queued during a load only on a frame.
        advance(16);
      }
    },
    async loseContext() {
      const heard = canvasEvent(game, "webglcontextlost");
      loseContextOf(game).loseContext();
      await heard;
    },
    async restoreContext() {
      const heard = canvasEvent(game, "webglcontextrestored");
      loseContextOf(game).restoreContext();
      await heard;
    },
    destroy() {
      stopGame(game);
      serveFrom(undefined);
    },
  };
}

/**
 * Runs a scene that does nothing of its own, for a spec to make game objects
 * in, as {@link runScene} runs any other.
 */
export async function runBareScene(
  options: SceneRunOptions = {},
): Promise<SceneRun<HostedScene>> {
  const { Scene } = await import("phaser");
  /** A scene with a key of its own, and nothing else. */
  class BareScene extends Scene implements HostedScene {
    readonly key = "bare";

    constructor() {
      super("bare");
    }
  }
  return runScene(() => new BareScene(), options);
}

/** The `keyCode` a browser gives each key that has one but a letter or digit. */
const KEY_CODES: Readonly<Record<string, number>> = {
  Backspace: 8,
  Tab: 9,
  Enter: 13,
  ShiftLeft: 16,
  ShiftRight: 16,
  ControlLeft: 17,
  ControlRight: 17,
  AltLeft: 18,
  AltRight: 18,
  Escape: 27,
  Space: 32,
  PageUp: 33,
  PageDown: 34,
  End: 35,
  Home: 36,
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40,
  Delete: 46,
};

/** Returns the `keyCode` a browser gives a key, by its `code`, or 0. */
function keyCodeOf(code: string): number {
  if (/^(Key[A-Z]|Digit\d)$/.test(code))
    return code.charCodeAt(code.length - 1);
  return KEY_CODES[code] ?? 0;
}

/** Returns the WebGL context's own means of losing and restoring itself. */
function loseContextOf(game: Game): WEBGL_lose_context {
  const context = game.canvas.getContext("webgl");
  const extension = context?.getExtension("WEBGL_lose_context");
  if (!extension) throw new Error("The game's canvas has no WebGL context");
  return extension;
}

/** Resolves on a later task, once the tasks queued before it have run. */
async function nextTask(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
}

/** Resolves once the game's canvas has raised an event. */
async function canvasEvent(game: Game, type: string): Promise<void> {
  await new Promise<void>((resolve) => {
    game.canvas.addEventListener(
      type,
      () => {
        resolve();
      },
      { once: true },
    );
  });
}

/** Waits for a scene to start running, which a scene that loads files takes a while to. */
async function started(scene: HostedScene, running: number): Promise<void> {
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (scene.sys.settings.status < running) {
    if (Date.now() > deadline) {
      throw new Error(`Scene "${scene.key}" didn't start`);
    }
    await nextTask();
  }
}
