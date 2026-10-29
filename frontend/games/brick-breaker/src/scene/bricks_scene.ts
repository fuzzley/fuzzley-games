import type { SceneSurroundings } from "@fz/phaser/host";
import type { CssRect, Viewport } from "@fz/phaser/layout";
import { onFirstFrame, pixelRatioOf, whenSceneEnds } from "@fz/phaser/scene";
import { Core, type GameObjects, Input, Scene } from "phaser";
import { columnMiddle, columnOf, rowMiddle, rowOf } from "../rules/grid";
import type { Steer } from "../rules/paddle";
import {
  type ArtFrame,
  FRAMES,
  PICTURE_FRAMES,
  type Pictures,
  ballFrame,
  brickColor,
  mapPictures,
} from "../view/art";
import { type FieldCommand, commandOfKey, heldKeyOf } from "../view/controls";
import { type Flourish, effectsOf, flourishesOf } from "../view/effects";
import { type FieldMetrics, fieldMetrics } from "../view/field_metrics";
import { glowAlpha } from "../view/flourish";
import type { FieldEvent, FieldFrame, FieldView } from "../view/frame";
import { LAYERS, type Layer } from "../view/layers";
import type { BricksPalette } from "../view/palette";
import { Steering, type TouchSteering } from "../view/steering";
import { ATLAS, bakeBricksAtlas } from "./atlas";
import { BallPainter } from "./ball_painter";
import { BoltPainter } from "./bolt_painter";
import { BrickPainter } from "./brick_painter";
import { CapsulePainter } from "./capsule_painter";
import { EffectsPainter } from "./effects_painter";
import { FieldPainter } from "./field_painter";
import { GlowPainter } from "./glow_painter";
import { PaddlePainter } from "./paddle_painter";
import { TagPainter } from "./tag_painter";

/** What the scene asks of the shell, and tells it. */
export interface BricksSceneOptions {
  /** Moves the game on by the time a frame took, the paddle steered as the player steers it. */
  readonly tick: (deltaMs: number, steer: Readonly<Steer>) => void;
  /** Returns the field to draw, as the game now stands. */
  readonly frame: () => FieldFrame;
  /** Returns the colors to draw in; a new value repaints the field. */
  readonly palette: () => BricksPalette;
  /** Returns whether the player welcomes motion. */
  readonly motion: () => boolean;
  /** Returns how a finger steers: by dragging, or by following it. */
  readonly touch: () => TouchSteering;
  /** Takes where the field now lies on the canvas, in CSS pixels. */
  readonly onLayout: (field: CssRect) => void;
  /** Takes what a key, a click or a tap asks of the game. */
  readonly command: (command: FieldCommand) => void;
  /** Takes a picture of every brick, ball and capsule as drawn, for How to play, each time they are drawn anew. */
  readonly onPictures: (pictures: Pictures) => void;
}

/** The keys the browser would otherwise scroll the page by, in Phaser's names. */
const CAPTURED_KEYS = "LEFT,RIGHT,UP,SPACE";

/**
 * Draws a level of Brick Breaker, handing the shell each frame's time and
 * steering before pulling the field to draw and playing what happened on
 * it, and turns keys, clicks and taps into commands.
 */
export class BricksScene extends Scene {
  /** How many scenes have been built, which numbers each one's key. */
  private static built = 0;

  /** The key the scene is registered under, which no other shares. */
  readonly key: string;

  /** Draws the field, its wall and the net. */
  field!: FieldPainter;
  /** Draws the bricks. */
  bricks!: BrickPainter;
  /** Frames the last bricks a level needs, once they glow. */
  glow!: GlowPainter;
  /** Draws the shards, the rings and the fades, and shakes the field. */
  effects!: EffectsPainter;
  /** Draws the capsules falling. */
  capsules!: CapsulePainter;
  /** Draws the laser's bolts. */
  bolts!: BoltPainter;
  /** Draws the paddle. */
  paddle!: PaddlePainter;
  /** Draws the tags of the effects in play. */
  tags!: TagPainter;
  /** Draws the balls. */
  balls!: BallPainter;

  /** Turns the keys and the pointer into each frame's steering. */
  private steering!: Steering;
  /** The canvas as the field was last laid out on it. */
  private viewport: Viewport | null = null;
  private metrics!: FieldMetrics;
  /** The palette the atlas was last baked in. */
  private painted!: BricksPalette;
  /** The atlas's frames, as last baked. */
  private frames!: readonly ArtFrame[];
  /** The field the scene draws, which a new level replaces. */
  private shownField: FieldView | null = null;
  /** The serial of the last event of the field the scene played. */
  private played = 0;
  /** The field's step at which its last brick broke, or it was first drawn. */
  private brokeAt = 0;
  /** The scene's time this frame, in milliseconds, by which the flourishes run. */
  private now = 0;
  /** Whether the player welcomes motion, as of this frame. */
  private motion = true;
  /**
   * The key events the scene has taken. Phaser hands over every key event
   * of a frame again with each new one, so a frame of three keys would
   * repeat the first.
   */
  private readonly keysTaken = new WeakSet<KeyboardEvent>();

  constructor(
    private readonly options: BricksSceneOptions,
    private readonly surroundings: SceneSurroundings,
  ) {
    const key = `bricks-scene-${String(++BricksScene.built)}`;
    super(key);
    this.key = key;
  }

  /** Measures, bakes the atlas, builds the field in its layers, back to front, and starts listening. */
  create(): void {
    this.painted = this.options.palette();
    this.measure();
    this.bake();
    const layers = this.layers();
    this.field = new FieldPainter(this, layers.field);
    this.bricks = new BrickPainter(this, layers.bricks);
    this.glow = new GlowPainter(this, layers.bursts);
    this.effects = new EffectsPainter(this, layers.bursts, layers.balls);
    this.capsules = new CapsulePainter(this, layers.capsules);
    this.bolts = new BoltPainter(this, layers.bolts);
    this.paddle = new PaddlePainter(this, layers.paddle, this.paddleEnds());
    this.tags = new TagPainter(this, layers.tags);
    this.balls = new BallPainter(this, layers.balls);
    this.steering = new Steering(this.metrics);
    this.layOut();
    this.listen();
    onFirstFrame(this, () => {
      this.surroundings.ready();
    });
  }

  /**
   * Hands the shell the time the frame took and the steering, then plays
   * what happened on the field since the last frame, once each, and draws
   * it as it now stands. It allocates nothing but on a new layout, a new
   * palette or a new level.
   */
  override update(time: number, delta: number): void {
    this.now = time;
    if (this.moved()) {
      if (this.measure()) this.rebake();
      this.layOut();
    }
    this.options.tick(delta, this.steering.read());
    const frame = this.options.frame();
    const palette = this.options.palette();
    this.motion = this.options.motion();
    if (palette !== this.painted) this.repaint(palette);
    if (frame.field !== this.shownField) this.startField(frame.field);
    frame.events.forEachSince(this.played, this.play);
    this.played = frame.events.latest;
    this.draw(frame);
  }

  /** Has each painter draw the field as it stands, in its layer. */
  private draw({ field, alpha }: FieldFrame): void {
    const metrics = this.metrics;
    this.field.draw(metrics, this.painted, field.net);
    this.bricks.show(field);
    this.bricks.animate(this.now);
    this.glow.draw(field, glowAlpha(field, this.brokeAt, this.motion), metrics);
    this.effects.animate(this.now);
    this.capsules.draw(field, alpha, metrics);
    this.bolts.draw(field, alpha, metrics);
    this.paddle.draw(field.paddle, field.mode, alpha, metrics);
    this.tags.draw(field, alpha, metrics, this.painted);
    this.balls.draw(field, alpha, metrics, this.motion);
  }

  /**
   * Plays an event: notes a brick breaking, and plays the flourishes it
   * calls for where motion is welcome. Made once, so playing makes nothing.
   */
  private readonly play = (event: Readonly<FieldEvent>): void => {
    const field = this.shownField;
    if (!field) return;
    if (event.kind === "broken") this.brokeAt = field.steps;
    const flourishes = flourishesOf(effectsOf(event, field), this.motion);
    for (const flourish of flourishes) this.flourish(flourish, event, field);
  };

  /** Plays one of an event's flourishes. */
  private flourish(
    flourish: Flourish,
    event: Readonly<FieldEvent>,
    field: FieldView,
  ): void {
    switch (flourish) {
      case "pop":
        this.bricks.pop(event.cell, this.now);
        return;
      case "grow":
        this.bricks.grow(event.cell, this.now);
        return;
      case "shards": {
        const brick = field.bricks[event.cell];
        if (!brick) return;
        this.effects.shatter(
          columnMiddle(columnOf(event.cell)),
          rowMiddle(rowOf(event.cell)),
          brickColor(brick, this.painted),
          this.metrics,
        );
        return;
      }
      case "ring":
        this.effects.ring(event.x, event.y, this.now, this.metrics);
        return;
      case "shake":
        this.effects.shake();
        return;
      case "fade":
        this.effects.fade(
          event.x,
          event.y,
          ballFrame(field.ballKind),
          this.now,
          this.metrics,
        );
        return;
    }
  }

  /** Returns a layer for each entry of the view's list, made back to front. */
  private layers(): Readonly<Record<Layer, GameObjects.Layer>> {
    const made = LAYERS.map((layer) => [layer, this.add.layer()] as const);
    // Object.fromEntries() types its keys as strings; these are the layers.
    return Object.fromEntries(made) as Record<Layer, GameObjects.Layer>;
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
   * Works out where the field lies on the canvas as it now is, and returns
   * whether the art must be drawn again: a unit of a new size, or a new
   * pixel ratio.
   */
  private measure(): boolean {
    const viewport: Viewport = {
      width: this.scale.width,
      height: this.scale.height,
      pixelRatio: pixelRatioOf(this),
      insets: this.surroundings.insets(),
    };
    const last = this.viewport ? this.metrics : null;
    this.viewport = viewport;
    this.metrics = fieldMetrics(viewport);
    return (
      last?.unit !== this.metrics.unit ||
      last.pixelRatio !== this.metrics.pixelRatio
    );
  }

  /** Puts the field where it was measured, and tells the shell where. */
  private layOut(): void {
    this.bricks.layout(this.metrics);
    this.effects.layout(this.metrics);
    this.steering.measure(this.metrics);
    this.options.onLayout(this.metrics.css);
  }

  /** Bakes the atlas again in a new palette. */
  private repaint(palette: BricksPalette): void {
    this.painted = palette;
    this.rebake();
  }

  /** Bakes the atlas at the field's scale, in the palette, and hands How to play its pictures. */
  private bake(): void {
    this.frames = bakeBricksAtlas(this, this.painted, this.metrics);
    this.options.onPictures(
      mapPictures(PICTURE_FRAMES, (frame) =>
        this.textures.getBase64(ATLAS, frame),
      ),
    );
  }

  /** Bakes the atlas again, and has every image take up its frame anew. */
  private rebake(): void {
    this.bake();
    this.bricks.refresh();
    this.glow.refresh();
    this.effects.refresh();
    this.capsules.refresh();
    this.bolts.refresh();
    this.paddle.refresh(this.paddleEnds());
    this.tags.refresh();
    this.balls.refresh();
  }

  /** Returns how wide the paddle's ends are, as the atlas's paddle frame keeps them. */
  private paddleEnds(): number {
    return this.frames.find((frame) => frame.name === FRAMES.paddle)?.ends ?? 0;
  }

  /**
   * Starts drawing a new field, from its first event, stopping what the
   * last one set off, and drops its bricks in where motion is welcome.
   */
  private startField(field: FieldView): void {
    this.shownField = field;
    this.played = 0;
    this.brokeAt = field.steps;
    this.tweens.killAll();
    this.bricks.still();
    this.effects.reset();
    this.balls.reset();
    this.bricks.show(field);
    if (this.motion) this.bricks.dropIn(this.metrics);
    else this.bricks.layout(this.metrics);
  }

  /** Turns the keys and the pointer into steering and commands. */
  private listen(): void {
    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.addCapture(CAPTURED_KEYS);
      keyboard.on(
        Input.Keyboard.Events.ANY_KEY_DOWN,
        (event: KeyboardEvent) => {
          this.onKeyDown(event);
        },
      );
      keyboard.on(Input.Keyboard.Events.ANY_KEY_UP, (event: KeyboardEvent) => {
        const held = heldKeyOf(event.code);
        if (held && this.isNew(event)) this.steering.release(held);
      });
    }
    this.input.on(Input.Events.POINTER_DOWN, (pointer: Input.Pointer) => {
      if (this.steering.pointerDown(pointer, this.options.touch())) {
        this.options.command("launch");
      }
    });
    this.input.on(Input.Events.POINTER_MOVE, (pointer: Input.Pointer) => {
      this.steering.pointerMove(pointer);
    });
    const up = (pointer: Input.Pointer): void => {
      if (this.steering.pointerUp(pointer)) this.options.command("launch");
    };
    this.input.on(Input.Events.POINTER_UP, up);
    this.input.on(Input.Events.POINTER_UP_OUTSIDE, up);
    this.letGoWhenAway();
  }

  /** Lets go of every key and finger as the window, the page or the field loses the player, so none sticks. */
  private letGoWhenAway(): void {
    const letGo = (): void => {
      this.steering.letGo();
    };
    // Phaser types the keyboard's target as anything; the game's is the board.
    const keys: unknown = this.game.input.keyboard?.target;
    const target = keys instanceof HTMLElement ? keys : null;
    const leave = (event: FocusEvent): void => {
      const to = event.relatedTarget;
      if (!(to instanceof Node && target?.contains(to))) letGo();
    };
    this.game.events.on(Core.Events.BLUR, letGo);
    this.game.events.on(Core.Events.HIDDEN, letGo);
    target?.addEventListener("focusout", leave);
    whenSceneEnds(this, () => {
      this.game.events.off(Core.Events.BLUR, letGo);
      this.game.events.off(Core.Events.HIDDEN, letGo);
      target?.removeEventListener("focusout", leave);
    });
  }

  /** Returns whether the scene hasn't taken a key event yet, and takes it. */
  private isNew(event: KeyboardEvent): boolean {
    if (this.keysTaken.has(event)) return false;
    this.keysTaken.add(event);
    return true;
  }

  /**
   * Holds a key that pushes the paddle, and passes on what any other key
   * asks, once per press, leaving the browser its shortcuts.
   */
  private onKeyDown(event: KeyboardEvent): void {
    if (!this.isNew(event)) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    const held = heldKeyOf(event.code);
    if (held) {
      this.steering.press(held);
      return;
    }
    if (event.repeat) return;
    const command = commandOfKey(event.code);
    if (!command) return;
    // Enter on a button over the field, such as Resume, presses the button.
    if (command === "go" && event.target !== this.game.input.keyboard?.target) {
      return;
    }
    this.options.command(command);
  }
}

/** Returns what builds a Brick Breaker scene, for the canvas to show. */
export function makeBricksScene(
  options: BricksSceneOptions,
): (surroundings: SceneSurroundings) => BricksScene {
  return (surroundings) => new BricksScene(options, surroundings);
}
