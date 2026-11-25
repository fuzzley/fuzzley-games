import { FIRST_X } from "@fz/brick-wall/rules/field";
import { columnOf, fieldRowOf } from "@fz/brick-wall/rules/grid";
import { ATLAS, WallAtlas } from "@fz/brick-wall/scene/atlas";
import { FieldCamera } from "@fz/brick-wall/scene/camera";
import { FieldPainter } from "@fz/brick-wall/scene/field_painter";
import { GuidePainter } from "@fz/brick-wall/scene/guide";
import { WallPainter } from "@fz/brick-wall/scene/wall_painter";
import type {
  PointerAiming,
  PointerRelease,
} from "@fz/brick-wall/view/aim_settings";
import { MOST_FINGERS } from "@fz/brick-wall/view/aiming";
import {
  type FieldMetrics,
  type FieldShape,
  fieldMetrics,
  hasRoom,
} from "@fz/brick-wall/view/field_metrics";
import type { EventLogView } from "@fz/core/event_log";
import { recordOf } from "@fz/core/records";
import type { SceneSurroundings } from "@fz/phaser/host";
import { type Insets, NO_INSETS } from "@fz/phaser/insets";
import type { Viewport } from "@fz/phaser/layout";
import {
  canvasChanged,
  onFirstFrame,
  onKeyDown,
  onPlayerAway,
  picturesWhenAsked,
  uniqueSceneKey,
  viewportOf,
} from "@fz/phaser/scene";
import { SpritePlayer } from "@fz/phaser/sound";
import { type GameObjects, Input, Scene } from "phaser";
import { WALL_RULES } from "../rules/bricks/wall_rules";
import type { KindId, Wall } from "../rules/catalog/kinds";
import type { FlightEvent } from "../rules/flight/events";
import type { FlightRules } from "../rules/tuning";
import { brickColor } from "../view/colors/brick_colors";
import type { WallPalette } from "../view/colors/palette";
import {
  type EventEffects,
  type Flourish,
  beatEffectsOf,
  createFrameSounds,
  flourishesOf,
} from "../view/effects/effects";
import { type Strip, rampFaceOf } from "../view/effects/flourish";
import type { SoundName } from "../view/effects/sounds";
import {
  type BallView,
  type LoggedBeat,
  type LoggedEvent,
  type RoundView,
  waitingX,
} from "../view/run_state";
import type { FieldCommand } from "../view/steering/controls";
import { type Steer, Steering } from "../view/steering/steering";
import { type GuideFlight, WallGuides } from "../view/field/guide";
import { FIELD_ART, GUIDE_ART, WALL_ART } from "./atlas";
import { LAYERS, type Layer } from "./layers";
import { BallPainter } from "./painters/ball_painter";
import { EffectsPainter } from "./painters/effects_painter";
import type { PaintContext, Painter } from "./painters/painter";
import { RallyPainter } from "./painters/rally_painter";
import { PICTURE_FRAMES, type Pictures, atlasWithPictures } from "./pictures";
import { SpringsPainter } from "./painters/springs_painter";
import spritemap from "./sounds/sounds.json";
import spriteUrl from "./sounds/sounds.wav?url";

/** The key the game's sound sprite is loaded and cached under. */
export const SOUNDS_KEY = "rickashay-sounds";

/** The keys the scene keeps from the page, so the arrows and Space steer rather than scroll it. */
const CAPTURED_KEYS = "LEFT,RIGHT,UP,DOWN,SPACE";

/** What the scene asks of the shell, and tells it. */
export interface RickashaySceneOptions {
  /**
   * Moves the game on by the time a frame took, the shot aimed as the
   * player aims it: let fly where the aim frame says it was released.
   */
  readonly tick: (deltaMs: number, aim: Readonly<Steer>) => void;
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
  /**
   * Returns the rules' numbers, as the debug menu may retune them, with the
   * turn the guide follows a shot to, `guideTurns`, as the player's setting
   * asks.
   */
  readonly rules: () => FlightRules;
  /**
   * Returns the flight the guide shows, or null where none shows, as while
   * the fuzzball flies: the rules' own cast for the aim, stopped
   * `guidePast` past its `guideTurns`th turn, as the rules handed over
   * with it say, and cast again as the aim, the start, the hot shot or
   * the rules change.
   */
  readonly guide: () => GuideFlight | null;
  /** Returns whether the player welcomes motion. */
  readonly motion: () => boolean;
  /** Returns whether the player wants sound. */
  readonly sound: () => boolean;
  /** Takes where the field and its panels now lie on the canvas. */
  readonly onLayout: (metrics: FieldMetrics) => void;
  /** Takes what a key asks of the game. */
  readonly command: (command: FieldCommand) => void;
  /**
   * Takes a picture of each drawn kind of brick as the atlas bakes, again
   * as it bakes afresh: a function that draws them only once a page shows
   * them.
   */
  readonly onPictures: (pictures: () => Pictures) => void;
}

/**
 * Draws a level of Rickashay: reads the player's keys, mouse and fingers
 * through its `Steering`, hands the shell each frame's time and aim, then
 * pulls the round to draw, plays the sounds of what it reached since the
 * last frame, and its flourishes where motion is welcome, and draws the
 * field, the rally on it, its springs, the wall, the guide, the
 * flourishes and the fuzzball as they stand; a key the steering doesn't
 * take becomes a command.
 */
export class RickashayScene extends Scene {
  /** The key the scene is registered under, which no other shares. */
  readonly key: string;

  /** Draws the field, its band, its lintel, its frame and its lines. */
  field!: FieldPainter<KindId>;
  /** Draws the rally under the danger line, in its look, and its fire. */
  rally!: RallyPainter;
  /** Draws the floor bounces' springs in the band. */
  springs!: SpringsPainter;
  /** Draws the wall. */
  wall!: WallPainter<KindId>;
  /** Draws the guide of the shot being aimed. */
  guide!: GuidePainter<KindId>;
  /** Draws what bursts from the wall and flashes on the field. */
  effects!: EffectsPainter;
  /** Plays the game's sounds, from the one sprite. */
  sounds!: SpritePlayer<SoundName>;
  /** Draws the fuzzball. */
  balls!: BallPainter;
  /** Turns the player's keys, mouse and fingers into the shot being aimed, which the bar's nudges and Release reach too. */
  steering!: Steering;
  /** Frames the camera on the field, and shakes it. */
  private fieldCamera!: FieldCamera;
  /** Every painter, back to front, which each frame draws, the field before the guide, which keeps its dots off the field's count. */
  private painters: readonly Painter[] = [];
  /** What the painters draw each frame from, which the scene writes over. */
  private context!: PaintContext;
  /** Reads the flight the guide shows as the guide's painter draws it, again only as it changes. */
  private readonly guides = new WallGuides();

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
  /**
   * The wall the view showed as the frame began, which its flourishes play
   * on: the one drawn the frame before, or one the shell has shown since,
   * as a level begun afresh.
   *
   * It holds every brick the frame's tick breaks, as a tick plays one frame
   * and the view writes over a wall it handed on only two walls later.
   */
  private frameWall!: Wall;
  /** Where the fuzzball last waited, across the field, which the steering aims a pointer from while it flies too. */
  private from: number = FIRST_X;
  /** The view's log of events played from, and the latest of its events played. */
  private eventLog: EventLogView<LoggedEvent> | null = null;
  private played = 0;
  /** The view's log of beats played from, and the latest of its beats played. */
  private beatLog: EventLogView<LoggedBeat> | null = null;
  private beaten = 0;
  /** Where the fuzzball last turned, on the field, which a spark flies from and a puff spreads from, written at each turn played. */
  private readonly turned = { x: 0, y: 0 };
  /** The strip a ramp's flash runs along, written for each. */
  private readonly rampFace: Strip = { x: 0, y: 0, length: 0, angle: 0 };
  /** Gathers the sounds a frame's events and beats call for, so each plays once a frame, at the most it rose. */
  private readonly frameSounds = createFrameSounds();

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
   * front, makes the steering and the sound player, which starts loading
   * the sprite, and starts listening, the events and beats the view has
   * reached already left unplayed.
   */
  create(): void {
    const { options } = this;
    this.measure();
    this.atlas = new WallAtlas(
      this,
      atlasWithPictures,
      options.palette(),
      this.metrics,
    );
    this.handPictures();
    const layers = this.layers();
    this.field = new FieldPainter(this, layers, FIELD_ART, WALL_RULES);
    this.rally = new RallyPainter(this, layers.rally);
    this.springs = new SpringsPainter(this, layers.springs);
    this.wall = new WallPainter(this, layers.wall, WALL_ART, WALL_RULES);
    this.guide = new GuidePainter(this, layers.guide, GUIDE_ART, this.field);
    this.effects = new EffectsPainter(this, layers.bursts);
    this.balls = new BallPainter(this, layers.balls);
    this.fieldCamera = new FieldCamera(this.cameras.main);
    this.painters = [
      this.field,
      this.rally,
      this.springs,
      this.wall,
      this.guide,
      this.effects,
      this.balls,
      this.fieldCamera,
    ];
    this.effects.layout(this.metrics);
    this.fieldCamera.fit(this.metrics, this.laidOut);
    this.steering = new Steering(this.metrics, this.canvas);
    this.aiming = options.pointerAiming();
    this.releasing = options.pointerRelease();
    this.steering.aimWith(this.aiming);
    this.steering.releaseBy(this.releasing);
    const view = options.view();
    this.wait(view.ball);
    this.follow(view);
    const rules = options.rules();
    this.context = {
      view,
      shape: this.laidOut,
      metrics: this.metrics,
      baked: this.atlas.scale,
      palette: this.atlas.palette,
      now: 0,
      motion: options.motion(),
      rules,
      guide: this.guides.of(options.guide(), rules),
    };
    // The game outlives the scene, so a scene built after another adds none.
    this.input.addPointer(
      Math.max(0, MOST_FINGERS - this.input.manager.pointersTotal),
    );
    options.onLayout(this.metrics);
    this.sounds = new SpritePlayer(this, {
      key: SOUNDS_KEY,
      spritemap,
      url: spriteUrl,
    });
    this.listen();
    onFirstFrame(this, () => {
      this.surroundings.ready();
    });
  }

  /**
   * Reads the steering, hands the shell the time the frame took and the
   * aim, then plays what the round reached since the last frame, once
   * each, and draws the round as the view now has it.
   *
   * It builds nothing of its own but on a new layout, a new palette, or
   * rules retuned to hold more floor bounces than it has springs for; the
   * sound player makes a voice for a sound the first times its plays
   * overlap, and Phaser a buffer source for each sound it plays, as Web
   * Audio starts each only once.
   */
  override update(time: number, delta: number): void {
    const { options, context } = this;
    context.now = time;
    this.fit();
    this.followSettings();
    this.frameWall = options.view().wall;
    options.tick(delta, this.steering.read(this.from));
    this.sounds.follow(options.sound());
    // The tick may have reshaped the field, between rounds.
    this.fit();
    if (this.atlas.bakeFor(options.palette(), this.metrics)) {
      this.handPictures();
    }
    const view = options.view();
    this.wait(view.ball);
    context.view = view;
    context.motion = options.motion();
    context.rules = options.rules();
    context.guide = this.guides.of(options.guide(), context.rules);
    this.follow(view);
    view.events.forEachSince(this.played, this.playEvent);
    this.played = view.events.latest;
    view.beats.forEachSince(this.beaten, this.playBeat);
    this.beaten = view.beats.latest;
    this.frameSounds.playEach(this.sounds.playRisen);
    this.draw();
  }

  /**
   * Takes up a log of events or of beats the scene hasn't read from yet at
   * its latest, so what it held before the scene met it goes unplayed, and
   * what comes after plays.
   */
  private follow(view: RoundView): void {
    if (view.events !== this.eventLog) {
      this.eventLog = view.events;
      this.played = view.events.latest;
    }
    if (view.beats !== this.beatLog) {
      this.beatLog = view.beats;
      this.beaten = view.beats.latest;
    }
  }

  /**
   * Plays an event of the flight: keeps where it turns, keeps the sounds it
   * calls for to play with the frame's others, and plays the flourishes it
   * calls for where motion is welcome.
   *
   * Made once, as the event log takes it each frame.
   */
  private readonly playEvent = ({
    event,
    effects,
  }: Readonly<LoggedEvent>): void => {
    if (event.kind === "turn") {
      this.turned.x = event.x;
      this.turned.y = event.y;
    }
    this.hear(effects);
    this.flourishAll(flourishesOf(effects, this.context.motion), event);
  };

  /**
   * Plays a beat of the round: keeps its sounds, and plays its flourishes
   * where motion is welcome.
   *
   * Made once, as the beat log takes it each frame.
   */
  private readonly playBeat = ({ beat }: Readonly<LoggedBeat>): void => {
    const effects = beatEffectsOf(beat);
    this.hear(effects);
    this.flourishAll(flourishesOf(effects, this.context.motion), null);
  };

  /** Keeps the sounds some effects call for, each risen as it says, to play with the frame's others, read by number. */
  private hear({ sounds }: EventEffects): void {
    const count = sounds.length;
    for (let at = 0; at < count; at++) {
      const cue = sounds[at];
      if (cue !== undefined) this.frameSounds.hear(cue.sound, cue.detune);
    }
  }

  /** Plays each of a moment's flourishes, read by number, as a frame's round of them makes nothing. */
  private flourishAll(
    flourishes: readonly Flourish[],
    event: Readonly<FlightEvent> | null,
  ): void {
    const count = flourishes.length;
    for (let at = 0; at < count; at++) {
      const flourish = flourishes[at];
      if (flourish !== undefined) this.flourish(flourish, event);
    }
  }

  /**
   * Plays one of an event's or a beat's flourishes, where it plays: on the
   * wall the view showed as the frame began, as the frame that reaches a
   * brick's break hands over a wall it has left, and one that reaches a
   * flight's last events the wall that comes down under where the flight's
   * still shows. A hatch's dip and swing and a lock's slide play nothing,
   * as the wall's painter moves no brick it bakes, so a hatch's bar loses
   * its dot and opens at once, and a lock's bolt is drawn back at once, as
   * the wall the view hands over shows them.
   */
  private flourish(
    flourish: Flourish,
    event: Readonly<FlightEvent> | null,
  ): void {
    const { now, view } = this.context;
    const wall = this.frameWall;
    switch (flourish.kind) {
      case "swell":
        this.wall.swell(wall, flourish.cell, now);
        return;
      case "shards":
        this.shatter(wall, flourish.cell);
        return;
      case "flash": {
        const face = rampFaceOf(wall, flourish.cell, this.rampFace);
        if (face) this.effects.flashRamp(face, this.atlas.palette.spark, now);
        return;
      }
      case "spark":
        this.effects.spark(this.turned.x, this.turned.y, now);
        return;
      case "draw-in":
      case "let-out":
        this.effects.swirl(
          columnOf(flourish.cell) + 0.5,
          fieldRowOf(wall, flourish.cell) + 0.5,
          flourish.kind === "draw-in",
          now,
        );
        return;
      case "ring":
        this.effects.ring(view.ball.x, view.ball.y, now);
        return;
      case "kick":
        if (event?.kind === "bounce-spent") this.springs.kick(event.held, now);
        this.effects.puff(this.turned.x, this.turned.y, now);
        return;
      case "streak":
        this.balls.dash();
        return;
      case "jump-line":
        this.effects.flashLine(now);
        return;
      case "flare":
        this.balls.flare(now);
        return;
      case "shake":
        this.fieldCamera.shake(now);
        return;
      case "dip":
      case "swing":
      case "slide":
        return;
    }
  }

  /** Bursts the brick a wall cell of a wall holds into shards of its color, if one does. */
  private shatter(wall: Wall, cell: number): void {
    const brick = wall.bricks[cell];
    if (!brick) return;
    this.effects.shatter(
      columnOf(cell) + 0.5,
      fieldRowOf(wall, cell) + 0.5,
      brickColor(brick, this.atlas.palette),
      this.metrics,
    );
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
    this.effects.layout(this.metrics);
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

  /** Hands the shell the pictures of each drawn kind of brick, as the atlas last baked them. */
  private handPictures(): void {
    this.options.onPictures(picturesWhenAsked(this, ATLAS, PICTURE_FRAMES));
  }
}

/** Returns what builds a Rickashay scene, for the canvas to show. */
export function makeRickashayScene(
  options: RickashaySceneOptions,
): (surroundings: SceneSurroundings) => RickashayScene {
  return (surroundings) => new RickashayScene(options, surroundings);
}
