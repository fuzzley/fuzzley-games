import { type Insets, NO_INSETS } from "@fz/phaser/insets";
import type { CssRect } from "@fz/phaser/layout";
import { pixelRatioOf } from "@fz/phaser/scene";
import { type SceneRun, runScene } from "@fz/phaser/testing";
import { BOARD_SIZE } from "../rules/arena";
import { type Run, createRun, step, turn } from "../rules/run";
import { boardMetrics, centerX, centerY } from "../view/board_metrics";
import type { BoardCommand } from "../view/controls";
import type { SnakeFrame } from "../view/frame";
import { type SnakePalette, snakePalette } from "../view/palette";
import { SOUNDS } from "../view/effects";
import { CRUMBS, FADE_MS, POP_MS } from "../view/timing";
import spritemap from "./sounds/sounds.json";
import {
  type SnakeScene,
  type SnakeSceneOptions,
  makeSnakeScene,
} from "./snake_scene";

const LIGHT = snakePalette({
  panel: "#ffffff",
  text: "#000000",
  accent: "#2a7a3a",
  danger: "#c0392b",
});

const DARK = snakePalette({
  panel: "#1b1b1f",
  text: "#f2f2f2",
  accent: "#6fcf7f",
  danger: "#ff6b5b",
});

/** A new run: the head at (4, 8) heading right, the apple at (12, 8). */
const START = createRun({ id: 1, seed: 7, speed: "normal" });

/** Returns a run stepped on a number of times. */
function stepped(run: Run, times: number): Run {
  let next = run;
  for (let i = 0; i < times; i++) next = step(next);
  return next;
}

/** The run the moment the snake eats the first apple. */
const EATEN = stepped(turn(START, "right"), 8);

/** The run the moment the snake runs into the top wall. */
const CRASHED = stepped(turn(START, "up"), 9);

/** Plays the shell's part, keeping what the scene tells it. */
class FakeShell implements SnakeSceneOptions {
  shown: SnakeFrame = { run: START, progress: 0, newBest: false };
  colors: SnakePalette = LIGHT;
  welcomesMotion = true;
  wantsSound = true;
  readonly ticks: number[] = [];
  readonly layouts: CssRect[] = [];
  readonly commands: BoardCommand[] = [];

  readonly tick = (deltaMs: number): void => {
    this.ticks.push(deltaMs);
  };
  readonly frame = (): SnakeFrame => this.shown;
  readonly palette = (): SnakePalette => this.colors;
  readonly motion = (): boolean => this.welcomesMotion;
  readonly sound = (): boolean => this.wantsSound;
  readonly onLayout = (board: CssRect): void => {
    this.layouts.push(board);
  };
  readonly command = (command: BoardCommand): void => {
    this.commands.push(command);
  };

  /** Shows a run on the board. */
  show(run: Run, newBest = false): void {
    this.shown = { run, progress: 0, newBest };
  }
}

/** Sets a shell up for a player who prefers less motion. */
function stillness(shell: FakeShell): void {
  shell.welcomesMotion = false;
}

interface Board {
  readonly shell: FakeShell;
  readonly run: SceneRun<SnakeScene>;
  readonly scene: SnakeScene;
  /** The element Phaser's keyboard listens on. */
  readonly keys: HTMLElement;
}

let running: SceneRun<SnakeScene> | null = null;

afterEach(() => {
  running?.destroy();
  running = null;
});

/** Runs the scene for a shell, its first frame drawn. */
async function startBoard(
  setUp: (shell: FakeShell) => void = () => undefined,
  insets: Insets = NO_INSETS,
): Promise<Board> {
  const shell = new FakeShell();
  setUp(shell);
  const keys = document.createElement("div");
  document.body.append(keys);
  const run = await runScene(makeSnakeScene(shell), {
    insets,
    config: { input: { keyboard: { target: keys } } },
  });
  running = run;
  run.advance(16);
  return { shell, run, scene: run.scene, keys };
}

/** Returns the board's layout on a 400 × 400 canvas, at one pixel to a pixel. */
function metricsFor(
  insets: Insets = NO_INSETS,
): ReturnType<typeof boardMetrics> {
  return boardMetrics(
    { width: 400, height: 400, pixelRatio: 1, insets },
    BOARD_SIZE,
  );
}

describe("SnakeScene", () => {
  describe("each frame", () => {
    it("hands the shell the time each frame took", async () => {
      const { shell, run } = await startBoard();

      run.advance(48, 16);

      expect(shell.ticks.slice(-3)).toEqual([16, 16, 16]);
    });

    it("says it is ready once it has drawn its first frame", async () => {
      const { run } = await startBoard();

      expect(run.ready).toBe(true);
    });
  });

  describe("the layout", () => {
    it("tells the shell where the board lies, inside the chrome", async () => {
      const insets = { top: 48, right: 0, bottom: 0, left: 0 };

      const { shell } = await startBoard(undefined, insets);

      expect(shell.layouts).toEqual([metricsFor(insets).css]);
    });

    it("lays the checkered squares over the board", async () => {
      const metrics = metricsFor();

      const { scene } = await startBoard();

      expect(scene.board.grid).toMatchObject({
        x: metrics.x,
        y: metrics.y,
        width: metrics.side,
        height: metrics.side,
        cellWidth: metrics.square,
        cellHeight: metrics.square,
      });
    });

    it("lays the board out again when the canvas changes size", async () => {
      const { shell, run, scene } = await startBoard();

      run.game.scale.resize(600, 400);
      run.advance(16);

      const metrics = boardMetrics(
        {
          width: 600,
          height: 400,
          pixelRatio: pixelRatioOf(scene),
          insets: NO_INSETS,
        },
        BOARD_SIZE,
      );
      expect(shell.layouts.at(-1)).toEqual(metrics.css);
    });
  });

  describe("the palette", () => {
    it("paints the squares in the palette", async () => {
      const { scene } = await startBoard();

      expect(scene.board.grid).toMatchObject({
        fillColor: LIGHT.board,
        altFillColor: LIGHT.checker,
      });
    });

    it("paints the board again in a new palette", async () => {
      const { shell, run, scene } = await startBoard();

      shell.colors = DARK;
      run.advance(16);

      expect(scene.board.grid).toMatchObject({
        fillColor: DARK.board,
        altFillColor: DARK.checker,
      });
    });
  });

  describe("the apple", () => {
    it("lies on its square", async () => {
      const metrics = metricsFor();
      const apple = START.apple ?? { x: 0, y: 0 };

      const { scene } = await startBoard();

      expect(scene.apple.image).toMatchObject({
        visible: true,
        x: centerX(metrics, apple),
        y: centerY(metrics, apple),
      });
    });

    it("pops up as a run begins", async () => {
      const { run, scene } = await startBoard();

      run.advance(POP_MS / 3);

      expect(scene.apple.image.scale).toBeLessThan(1);
    });

    it("shows whole at once where the player prefers less motion", async () => {
      const { scene } = await startBoard(stillness);

      expect(scene.apple.image.scale).toBe(1);
    });
  });

  describe("the snake", () => {
    it("is drawn in the snake's colors", async () => {
      const { scene } = await startBoard();

      expect(scene.snake.graphics.commandBuffer).toEqual(
        expect.arrayContaining([LIGHT.snake, LIGHT.head]),
      );
    });

    it("is drawn faded once it has crashed and faded", async () => {
      const { shell, run, scene } = await startBoard(stillness);

      shell.show(CRASHED);
      run.advance(16);

      expect(scene.snake.graphics.commandBuffer).toEqual(
        expect.arrayContaining([LIGHT.faded]),
      );
    });
  });

  describe("a step's effects", () => {
    it("scatter crumbs where the snake eats", async () => {
      const { shell, run, scene } = await startBoard();

      shell.show(EATEN);
      run.advance(16);

      expect(scene.effects.crumbs.getAliveParticleCount()).toBe(CRUMBS);
    });

    it("play once, however many frames show the step", async () => {
      const { shell, run, scene } = await startBoard();

      shell.show(EATEN);
      run.advance(1_000);

      expect(scene.effects.crumbs.getAliveParticleCount()).toBe(0);
    });

    it("shake the board at a crash", async () => {
      const { shell, run, scene } = await startBoard();

      shell.show(CRASHED);
      run.advance(16);

      expect(scene.cameras.main.shakeEffect.isRunning).toBe(true);
    });

    it("fade the crashed snake over time", async () => {
      const { shell, run, scene } = await startBoard();

      shell.show(CRASHED);
      run.advance(FADE_MS + 64);

      expect(scene.effects.fade).toBe(1);
    });

    it("leave out the crumbs and the shake where the player prefers less motion", async () => {
      const { shell, run, scene } = await startBoard(stillness);

      shell.show(EATEN);
      run.advance(16);
      shell.show(CRASHED);
      run.advance(16);

      expect({
        crumbs: scene.effects.crumbs.getAliveParticleCount(),
        shaking: scene.cameras.main.shakeEffect.isRunning,
      }).toEqual({ crumbs: 0, shaking: false });
    });

    it("fade a crashed snake at once where the player prefers less motion", async () => {
      const { shell, run, scene } = await startBoard(stillness);

      shell.show(CRASHED);
      run.advance(16);

      expect(scene.effects.fade).toBe(1);
    });

    it("stop as a new run begins", async () => {
      const { shell, run, scene } = await startBoard();
      shell.show(CRASHED);
      run.advance(64);

      shell.show(createRun({ id: 2, seed: 9, speed: "normal" }));
      run.advance(16);

      expect({
        fade: scene.effects.fade,
        shaking: scene.cameras.main.shakeEffect.isRunning,
      }).toEqual({ fade: 0, shaking: false });
    });
  });

  describe("the controls", () => {
    it("turn a key into a command", async () => {
      const { shell, run } = await startBoard();

      run.key("keydown", "ArrowUp");
      run.key("keydown", "Space", " ");
      run.advance(16);

      expect(shell.commands).toEqual(["up", "toggle"]);
    });

    it("turn into the commands they ask for, each once, however many come in a frame", async () => {
      const { shell, run } = await startBoard();

      run.key("keydown", "ArrowUp");
      run.key("keydown", "ArrowLeft");
      run.key("keydown", "Space", " ");
      run.key("keydown", "Escape");
      run.advance(16);

      expect(shell.commands).toEqual(["up", "left", "toggle", "pause"]);
    });

    it("turn Enter on the board into going on", async () => {
      const { shell, run } = await startBoard();

      run.key("keydown", "Enter");
      run.advance(16);

      expect(shell.commands).toEqual(["go"]);
    });

    it("ignore a held key, a shortcut and a key the game doesn't use", async () => {
      const { shell, run, keys } = await startBoard();

      keys.dispatchEvent(
        new KeyboardEvent("keydown", { code: "ArrowUp", repeat: true }),
      );
      keys.dispatchEvent(
        new KeyboardEvent("keydown", { code: "KeyS", ctrlKey: true }),
      );
      run.key("keydown", "KeyQ", "q");
      run.advance(16);

      expect(shell.commands).toEqual([]);
    });

    it("turn a swipe into a turn each time it goes far enough", async () => {
      const { shell, run } = await startBoard();

      run.pointer("down", 100, 100);
      run.pointer("move", 110, 102);
      run.pointer("move", 130, 104);
      run.pointer("move", 132, 140);
      run.pointer("up", 132, 140);
      run.pointer("move", 200, 140);

      expect(shell.commands).toEqual(["right", "down"]);
    });
  });

  describe("the sounds", () => {
    it("are the view's, in the sprite's order", () => {
      expect(Object.keys(spritemap.spritemap)).toEqual(SOUNDS);
    });

    it("can be heard while the player wants them", async () => {
      const { scene } = await startBoard();

      expect(scene.sound.mute).toBe(false);
    });

    it("are muted while the player wants none", async () => {
      const { shell, run, scene } = await startBoard();

      shell.wantsSound = false;
      run.advance(16);

      expect(scene.sound.mute).toBe(true);
    });

    it("leave the board playing where they can't be loaded", async () => {
      const { shell, run, scene } = await startBoard();

      shell.show(EATEN);
      run.advance(16);

      expect(scene.sounds.loaded).toBe(false);
      expect(scene.effects.crumbs.getAliveParticleCount()).toBe(CRUMBS);
    });
  });
});
