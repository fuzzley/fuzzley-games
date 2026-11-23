import { FIRST_X } from "@fz/brick-wall/rules/field";
import type { WallRules } from "@fz/brick-wall/rules/wall";
import { WallAtlas } from "@fz/brick-wall/scene/atlas";
import { FieldCamera } from "@fz/brick-wall/scene/camera";
import { FieldPainter } from "@fz/brick-wall/scene/field_painter";
import { WallPainter } from "@fz/brick-wall/scene/wall_painter";
import type {
  PointerAiming,
  PointerRelease,
} from "@fz/brick-wall/view/aim_settings";
import { type AimFrame, MOST_FINGERS } from "@fz/brick-wall/view/aiming";
import {
  type FieldMetrics,
  type FieldShape,
  fieldMetrics,
  hasRoom,
} from "@fz/brick-wall/view/field_metrics";
import { recordOf } from "@fz/core/records";
import type { SceneSurroundings } from "@fz/phaser/host";
import { type Insets, NO_INSETS } from "@fz/phaser/insets";
import type { Viewport } from "@fz/phaser/layout";
import {
  canvasChanged,
  onFirstFrame,
  onKeyDown,
  onPlayerAway,
  uniqueSceneKey,
  viewportOf,
} from "@fz/phaser/scene";
import { type GameObjects, Input, Scene } from "phaser";
import { type KindId, kindOf } from "../rules/catalog/kinds";
import type { FlightRules } from "../rules/tuning";
import type { WallPalette } from "../view/colors/palette";
import { type BallView, type RoundView, waitingX } from "../view/run_state";
import type { FieldCommand } from "../view/steering/controls";
import { Steering } from "../view/steering/steering";
import { FIELD_ART, WALL_ART, wallAtlasFrames } from "./atlas";
import { LAYERS, type Layer } from "./layers";
import { BallPainter } from "./painters/ball_painter";
import type { PaintContext, Painter } from "./painters/painter";
import { PillPainter } from "./painters/pill_painter";
import { SpringsPainter } from "./painters/springs_painter";

/** The keys the scene keeps from the page, so the arrows and Space steer rather than scroll it. */
const CAPTURED_KEYS = "LEFT,RIGHT,UP,DOWN,SPACE";

/**
 * Which bricks a level needs broken, which the field's lines count and the
 * danger reads: the catalog's. The painters read nothing else of a wall's
 * rules, and step no wall between rounds.
 */
const WALL_RULES: WallRules<KindId> = {
  needed: (kind) => kindOf(kind).needed,
  betweenRounds: (wall) => wall,
};

/** What the scene asks of the shell, and tells it. */
export interface RickashaySceneOptions {
  /**
   * Moves the game on by the time a frame took, the shot aimed as the
   * player aims it: let fly where the aim frame says it was released.
   */
  readonly tick: (deltaMs: number, aim: Readonly<AimFrame>) => void;
  /**
   * Returns the round in play as the view draws it at this moment, as
   * `RoundPlay`'s `view`, read once a frame after the tick.
   */
  readonly view: () => RoundView;
  /** Returns how the mouse and fingers aim, as the settings say; a new value is handed to the steering. */
  readonly pointerAiming: () => PointerAiming;
  /** Returns how a pointer's press lets the shot fly, as the settings say; a new value is handed to the steering. */
  readonly pointerRelease: () => PointerRelease;
  /** Returns the colors to draw in; a new value bakes the atlas again. */
  readonly palette: () => WallPalette;
  /** Returns the field's shape, worked out between rounds; a new value lays the field out again. */
  readonly shape: () => FieldShape;
  /** Returns the rules' numbers, as the debug menu may retune them. */
  readonly rules: () => FlightRules;
  /** Returns whether the player welcomes motion. */
  readonly motion: () => boolean;
  /** Takes where the field and its panels now lie on the canvas. */
  readonly onLayout: (metrics: FieldMetrics) => void;
  /** Takes what a key asks of the game. */
  readonly command: (command: FieldCommand) => void;
}

/**
 * Draws a level of Rickashay: reads the player's keys, mouse and fingers
 * through its `Steering`, hands the shell each frame's time and aim, then
 * pulls the round to draw and draws the field, its springs, the wall, the
 * fuzzball and the rally's pill beside it as they stand; a key the
 * steering doesn't take becomes a command.
 */
export class RickashayScene extends Scene {
  /** The key the scene is registered under, which no other shares. */
  readonly key: string;

  /** Draws the field, its band, its lintel, its frame and its lines. */
  field!: FieldPainter<KindId>;
  /** Draws the floor bounces' springs in the band. */
  springs!: SpringsPainter;
  /** Draws the wall. */
  wall!: WallPainter<KindId>;
  /** Draws the fuzzball. */
  balls!: BallPainter;
  /** Draws the rally in its pill beside the fuzzball. */
  pill!: PillPainter;
  /** Turns the player's keys, mouse and fingers into the shot being aimed, which the bar's nudges and Release reach too. */
  steering!: Steering;
  /** Frames the camera on the field. */
  private fieldCamera!: FieldCamera;
  /** Every painter, back to front, which each frame draws. */
  private painters: readonly Painter[] = [];
  /** What the painters draw each frame from, which the scene writes over. */
  private context!: PaintContext;

  /** The canvas as the field was last measured on it, or null before it first was. */
  private viewport: Viewport | null = null;
  /** The chrome over the canvas as the field was last measured. */
  private chrome: Insets = NO_INSETS;
  /** The field's shape as the shell last handed it, laid out by or not. */
  private shaped!: FieldShape;
  /** The field's shape it was last laid out by. */
  private laidOut!: FieldShape;
  private metrics!: FieldMetrics;
  /** Bakes the atlas, in the palette and at the field's scale. */
  private atlas!: WallAtlas<WallPalette>;
  /** The canvas the field was last laid out on. */
  private canvas!: Viewport;
  /** How the mouse and fingers aim, and how a press lets fly, as the steering was last told. */
  private aiming!: PointerAiming;
  private releasing!: PointerRelease;
  /** Where the fuzzball last waited, across the field, which the steering aims a pointer from while it flies too. */
  private from: number = FIRST_X;

  constructor(
    private readonly options: RickashaySceneOptions,
    private readonly surroundings: SceneSurroundings,
  ) {
    const key = uniqueSceneKey("rickashay-scene");
    super(key);
    this.key = key;
  }

  /**
   * Measures, bakes the atlas, builds the field in its layers, back to
   * front, makes the steering, and starts listening.
   */
  create(): void {
    const { options } = this;
    this.measure();
    this.atlas = new WallAtlas(
      this,
      wallAtlasFrames,
      options.palette(),
      this.metrics,
    );
    const layers = this.layers();
    this.field = new FieldPainter(this, layers, FIELD_ART, WALL_RULES);
    this.springs = new SpringsPainter(this, layers.springs);
    this.wall = new WallPainter(this, layers.wall, WALL_ART, WALL_RULES);
    this.balls = new BallPainter(this, layers.balls);
    this.pill = new PillPainter(this, layers.pill);
    this.fieldCamera = new FieldCamera(this.cameras.main);
    this.painters = [
      this.field,
      this.springs,
      this.wall,
      this.balls,
      this.pill,
      this.fieldCamera,
    ];
    this.fieldCamera.fit(this.metrics, this.laidOut);
    this.steering = new Steering(this.metrics, this.canvas);
    this.aiming = options.pointerAiming();
    this.releasing = options.pointerRelease();
    this.steering.aimWith(this.aiming);
    this.steering.releaseBy(this.releasing);
    const view = options.view();
    this.wait(view.ball);
    this.context = {
      view,
      shape: this.laidOut,
      metrics: this.metrics,
      baked: this.atlas.scale,
      palette: this.atlas.palette,
      now: 0,
      motion: options.motion(),
      rules: options.rules(),
    };
    // The game outlives the scene, so a scene built after another adds none.
    this.input.addPointer(
      Math.max(0, MOST_FINGERS - this.input.manager.pointersTotal),
    );
    options.onLayout(this.metrics);
    this.listen();
    onFirstFrame(this, () => {
      this.surroundings.ready();
    });
  }

  /**
   * Reads the steering, hands the shell the time the frame took and the
   * aim, then draws the round as the view now has it.
   *
   * It builds nothing of its own but on a new layout, a new palette, or
   * rules retuned to hold more floor bounces than it has springs for.
   */
  override update(time: number, delta: number): void {
    const { options, context } = this;
    context.now = time;
    this.fit();
    this.followSettings();
    options.tick(delta, this.steering.read(this.from));
    // The tick may have reshaped the field, between rounds.
    this.fit();
    this.atlas.bakeFor(options.palette(), this.metrics);
    const view = options.view();
    this.wait(view.ball);
    context.view = view;
    context.motion = options.motion();
    context.rules = options.rules();
    this.draw();
  }

  /** Has each painter draw the field as it stands, in its layer. */
  private draw(): void {
    const { context } = this;
    context.shape = this.laidOut;
    context.metrics = this.metrics;
    context.baked = this.atlas.scale;
    context.palette = this.atlas.palette;
    this.painters.forEach(this.paint);
  }

  /** Has a painter draw the frame: made once, so the frame's round of the painters makes nothing. */
  private readonly paint = (painter: Painter): void => {
    painter.draw(this.context);
  };

  /** Hands the steering how the mouse and fingers aim, and how a press lets fly, as the settings now say. */
  private followSettings(): void {
    const { options, steering } = this;
    const aiming = options.pointerAiming();
    if (aiming !== this.aiming) {
      this.aiming = aiming;
      steering.aimWith(aiming);
    }
    const releasing = options.pointerRelease();
    if (releasing !== this.releasing) {
      this.releasing = releasing;
      steering.releaseBy(releasing);
    }
  }

  /** Keeps where the fuzzball waits, which the steering aims a pointer from while it flies too. */
  private wait(ball: BallView): void {
    this.from = waitingX(ball) ?? this.from;
  }

  /** Returns a layer for each entry of the list, made back to front. */
  private layers(): Readonly<Record<Layer, GameObjects.Layer>> {
    return recordOf(LAYERS, () => this.add.layer());
  }

  /** Lays the field out again if the canvas, the chrome over it or its shape changed. */
  private fit(): void {
    if (!this.moved() || !this.measure()) return;
    this.options.onLayout(this.metrics);
    this.steering.measure(this.metrics, this.canvas);
    this.fieldCamera.fit(this.metrics, this.laidOut);
  }

  /** Returns whether the canvas, its pixel ratio, the chrome over it or the field's shape changed. */
  private moved(): boolean {
    return (
      canvasChanged(this, this.viewport) ||
      this.chrome !== this.surroundings.insets() ||
      this.shaped !== this.options.shape()
    );
  }

  /**
   * Works out where the field lies on the canvas as it now is, and returns
   * whether it laid it out: after the first time, a canvas with no room
   * inside its chrome, as a hidden board's, keeps the layout it had.
   */
  private measure(): boolean {
    const first = this.viewport === null;
    this.chrome = this.surroundings.insets();
    this.shaped = this.options.shape();
    this.viewport = viewportOf(this, this.chrome);
    if (!first && !hasRoom(this.viewport)) return false;
    this.laidOut = this.shaped;
    this.canvas = this.viewport;
    this.metrics = fieldMetrics(this.viewport, this.shaped);
    return true;
  }

  /**
   * Hands the keys, the mouse, its wheel and the fingers to the steering, a
   * pointer let go past the canvas too, passes on what the keys it doesn't
   * take ask of the game, and calls the shot off as the player looks away,
   * so no press sticks.
   */
  private listen(): void {
    const { steering } = this;
    this.input.keyboard?.addCapture(CAPTURED_KEYS);
    onKeyDown(this, (event) => {
      const command = steering.keyDown(event);
      if (command) this.options.command(command);
    });
    this.input.on(Input.Events.POINTER_DOWN, (pointer: Input.Pointer) => {
      steering.pointerDown(pointer);
    });
    this.input.on(Input.Events.POINTER_MOVE, (pointer: Input.Pointer) => {
      steering.pointerMove(pointer);
    });
    const up = (pointer: Input.Pointer): void => {
      steering.pointerUp(pointer);
    };
    this.input.on(Input.Events.POINTER_UP, up);
    this.input.on(Input.Events.POINTER_UP_OUTSIDE, up);
    this.input.on(
      Input.Events.POINTER_WHEEL,
      (_pointer: Input.Pointer, _over: unknown, _dx: number, dy: number) => {
        steering.wheel(dy);
      },
    );
    onPlayerAway(this, () => {
      steering.callOff();
    });
  }
}

/** Returns what builds a Rickashay scene, for the canvas to show. */
export function makeRickashayScene(
  options: RickashaySceneOptions,
): (surroundings: SceneSurroundings) => RickashayScene {
  return (surroundings) => new RickashayScene(options, surroundings);
}
