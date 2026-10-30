import type { SceneSurroundings } from "@fz/phaser/host";
import type { CssRect, Viewport } from "@fz/phaser/layout";
import { onFirstFrame, onKeyDown, pixelRatioOf } from "@fz/phaser/scene";
import { SpritePlayer } from "@fz/phaser/sound";
import { Input, Scene } from "phaser";
import { BOARD_SIZE } from "../rules/arena";
import { type BoardMetrics, boardMetrics } from "../view/board_metrics";
import {
  type BoardCommand,
  SWIPE_CSS_PX,
  SwipeReader,
  commandOfKey,
} from "../view/controls";
import { type SoundName, effectsOf } from "../view/effects";
import type { SnakeFrame } from "../view/frame";
import type { SnakePalette } from "../view/palette";
import { ApplePainter } from "./apple_painter";
import { BoardPainter } from "./board_painter";
import { EffectsPainter } from "./effects_painter";
import { SnakePainter } from "./snake_painter";
import spritemap from "./sounds/sounds.json";
import spriteUrl from "./sounds/sounds.wav?url";
import { bakeApple, bakeCrumb } from "./textures";

/** What the scene asks of the shell, and tells it. */
export interface SnakeSceneOptions {
  /** Moves the game on by the time a frame took, in milliseconds. */
  readonly tick: (deltaMs: number) => void;
  /** Returns the board to draw, as the game now stands. */
  readonly frame: () => SnakeFrame;
  /** Returns the colors to draw in; a new value repaints the board. */
  readonly palette: () => SnakePalette;
  /** Returns whether the player welcomes motion. */
  readonly motion: () => boolean;
  /** Returns whether the player wants sound. */
  readonly sound: () => boolean;
  /** Takes where the board now lies on the canvas, in CSS pixels. */
  readonly onLayout: (board: CssRect) => void;
  /** Takes what a key or a swipe asks of the game. */
  readonly command: (command: BoardCommand) => void;
}

/** The keys the browser would otherwise scroll the page by. */
const CAPTURED_KEYS = "UP,RIGHT,DOWN,LEFT,SPACE";

/**
 * Draws a run of Snake, pulling each frame from the shell after handing it
 * the time the frame took, and turns keys and swipes into commands.
 */
export class SnakeScene extends Scene {
  /** How many scenes have been built, which numbers each one's key. */
  private static built = 0;

  /** The key the scene is registered under, which no other shares. */
  readonly key: string;

  /** Draws the squares and the wall. */
  board!: BoardPainter;
  /** Draws the apple. */
  apple!: ApplePainter;
  /** Draws the snake. */
  snake!: SnakePainter;
  /** Plays the crumbs, the shake and the fade. */
  effects!: EffectsPainter;
  /** Plays the sounds. */
  sounds!: SpritePlayer<SoundName>;

  /** The canvas as the board was last laid out on it. */
  private viewport: Viewport | null = null;
  private metrics!: BoardMetrics;
  /** The palette the board was last painted in. */
  private painted!: SnakePalette;
  /** The run whose steps the scene follows. */
  private runId = -1;
  /** How many steps of it the scene has played the effects of. */
  private steps = -1;

  constructor(
    private readonly options: SnakeSceneOptions,
    private readonly surroundings: SceneSurroundings,
  ) {
    const key = `snake-scene-${++SnakeScene.built}`;
    super(key);
    this.key = key;
  }

  /** Builds the board in layers, back to front, and starts listening. */
  create(): void {
    this.painted = this.options.palette();
    this.measure();
    this.bake();
    this.board = new BoardPainter(this, this.add.layer());
    this.apple = new ApplePainter(this, this.add.layer());
    this.snake = new SnakePainter(this, this.add.layer());
    this.effects = new EffectsPainter(this, this.add.layer());
    this.sounds = new SpritePlayer(this, {
      key: "snake-sounds",
      spritemap,
      url: spriteUrl,
    });
    this.layOut();
    this.listen();
    onFirstFrame(this, () => {
      this.surroundings.ready();
    });
  }

  /**
   * Hands the shell the time the frame took, then draws the board as it now
   * stands, playing a new step's effects once. It allocates nothing but on a
   * step, a new layout or a new palette.
   */
  override update(_time: number, delta: number): void {
    this.options.tick(delta);
    this.sounds.follow(this.options.sound());
    const frame = this.options.frame();
    const palette = this.options.palette();
    if (palette !== this.painted) this.repaint(palette);
    if (this.moved()) {
      if (this.measure()) this.rebake();
      this.layOut();
    }
    const run = frame.run;
    if (run.id !== this.runId) this.startRun(run.id);
    if (run.steps !== this.steps) this.playStep(frame);
    this.apple.place(run.apple, this.metrics);
    this.snake.draw(frame, this.metrics, palette, this.effects.fade);
  }

  /** Returns whether the canvas, its pixel ratio or the chrome over it changed. */
  private moved(): boolean {
    const viewport = this.viewport;
    if (!viewport) return true;
    return (
      viewport.width !== this.scale.width ||
      viewport.height !== this.scale.height ||
      viewport.pixelRatio !== pixelRatioOf(this) ||
      viewport.insets !== this.surroundings.insets()
    );
  }

  /**
   * Works out where the board lies on the canvas as it now is, and returns
   * whether its squares changed size.
   */
  private measure(): boolean {
    const viewport: Viewport = {
      width: this.scale.width,
      height: this.scale.height,
      pixelRatio: pixelRatioOf(this),
      insets: this.surroundings.insets(),
    };
    const square = this.viewport ? this.metrics.square : 0;
    this.viewport = viewport;
    this.metrics = boardMetrics(viewport, BOARD_SIZE);
    return this.metrics.square !== square;
  }

  /** Puts the board where it was measured, and tells the shell where. */
  private layOut(): void {
    this.board.layout(this.metrics, this.painted);
    this.effects.layout(this.metrics);
    this.options.onLayout(this.metrics.css);
  }

  /** Paints the board in a new palette, and bakes the textures in it. */
  private repaint(palette: SnakePalette): void {
    this.painted = palette;
    this.board.paint(this.metrics, palette);
    this.rebake();
  }

  /** Bakes the textures at the squares' size, in the palette. */
  private bake(): void {
    bakeApple(this, this.metrics.square, this.painted);
    bakeCrumb(this, this.metrics.square, this.painted);
  }

  /** Bakes the textures again, and has what shows them take them up. */
  private rebake(): void {
    this.bake();
    this.apple.refresh();
    this.effects.refresh();
  }

  /** Stops what the last run left playing, for a new one. */
  private startRun(id: number): void {
    this.runId = id;
    this.steps = -1;
    this.tweens.killAll();
    this.apple.reset();
    this.effects.reset();
  }

  /** Plays what the run's last step calls for. */
  private playStep(frame: SnakeFrame): void {
    const run = frame.run;
    this.steps = run.steps;
    const motion = this.options.motion();
    const effects = effectsOf(run, frame.newBest, motion);
    this.apple.place(run.apple, this.metrics);
    if (effects.pop) this.apple.pop();
    this.effects.play(effects, this.metrics, motion);
    if (effects.sound) this.sounds.play(effects.sound);
  }

  /** Turns keys and swipes over the board into commands. */
  private listen(): void {
    this.input.keyboard?.addCapture(CAPTURED_KEYS);
    onKeyDown(this, (event) => {
      this.onKey(event);
    });
    const swipe = new SwipeReader();
    this.input.on(Input.Events.POINTER_DOWN, (pointer: Input.Pointer) => {
      swipe.start(pointer.x, pointer.y);
    });
    this.input.on(Input.Events.POINTER_MOVE, (pointer: Input.Pointer) => {
      const way = swipe.move(
        pointer.x,
        pointer.y,
        SWIPE_CSS_PX * pixelRatioOf(this),
      );
      if (way) this.options.command(way);
    });
    const end = (): void => {
      swipe.end();
    };
    this.input.on(Input.Events.POINTER_UP, end);
    this.input.on(Input.Events.POINTER_UP_OUTSIDE, end);
  }

  /**
   * Passes on what a key asks, once per press, leaving the browser its
   * shortcuts.
   */
  private onKey(event: KeyboardEvent): void {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    const command = commandOfKey(event.code);
    if (!command) return;
    // Enter on a button over the board, such as Resume, presses the button.
    if (command === "go" && event.target !== this.game.input.keyboard?.target) {
      return;
    }
    this.options.command(command);
  }
}

/** Returns what builds a Snake scene, for the canvas to show. */
export function makeSnakeScene(
  options: SnakeSceneOptions,
): (surroundings: SceneSurroundings) => SnakeScene {
  return (surroundings) => new SnakeScene(options, surroundings);
}
