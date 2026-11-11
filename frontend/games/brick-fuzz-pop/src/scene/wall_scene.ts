import type { EventLogView } from "@fz/core/event_log";
import { isShortcut } from "@fz/core/keys";
import { recordOf } from "@fz/core/records";
import type { SceneSurroundings } from "@fz/phaser/host";
import { type Insets, NO_INSETS } from "@fz/phaser/insets";
import type { Viewport } from "@fz/phaser/layout";
import {
  canvasChanged,
  onFirstFrame,
  onKeyDown,
  onKeyUp,
  onPlayerAway,
  picturesWhenAsked,
  retakeFrames,
  uniqueSceneKey,
  viewportOf,
} from "@fz/phaser/scene";
import type { ArtScale } from "@fz/phaser/shapes";
import { SpritePlayer } from "@fz/phaser/sound";
import { type GameObjects, Input, Scene } from "phaser";
import type { FlightEvent } from "../rules/flight/events";
import type { Guide } from "../rules/flight/guide";
import { columnOf, fieldRowOf } from "../rules/grid";
import type { Crew } from "../rules/round/round";
import type { Boon } from "../rules/shot";
import { FIRST_X } from "../rules/tuning";
import type { Wall } from "../rules/wall/wall";
import { brickColor } from "../view/colors/brick_colors";
import type { WallPalette } from "../view/colors/palette";
import {
  type EventEffects,
  type Flourish,
  type SoundName,
  beatEffectsOf,
  createFrameSounds,
  detuneOf,
  flourishesOf,
} from "../view/effects/effects";
import {
  type FieldMetrics,
  type FieldShape,
  fieldMetrics,
  hasRoom,
} from "../view/field/field_metrics";
import type { LoggedBeat, LoggedEvent, RoundView } from "../view/round_play";
import { type PointerAimings, STRAIGHT_UP } from "../view/steering/aiming";
import { type FieldCommand, commandOfKey } from "../view/steering/controls";
import { MOST_FINGERS, type Steer, Steering } from "../view/steering/steering";
import { ATLAS, bakeWallAtlas, bakedScaleOf } from "./atlas";
import { LAYERS, type Layer } from "./layers";
import { BallPainter } from "./painters/ball_painter";
import { EffectsPainter } from "./painters/effects_painter";
import { FieldPainter } from "./painters/field_painter";
import { GuidePainter } from "./painters/guide_painter";
import { MeterPainter } from "./painters/meter_painter";
import type { PaintContext, Painter } from "./painters/painter";
import { WallPainter } from "./painters/wall_painter";
import { PICTURE_FRAMES, type Pictures } from "./pictures";
import spritemap from "./sounds/sounds.json";
import spriteUrl from "./sounds/sounds.wav?url";

/** The keys the scene keeps from the page, so the arrows and Space steer rather than scroll it. */
const CAPTURED_KEYS = "LEFT,RIGHT,UP,DOWN,SPACE";

/** The steering of a frame before the first, which the context holds until the scene first reads it. */
const UNSTEERED: Readonly<Steer> = {
  aim: STRAIGHT_UP,
  charge: 0,
  release: false,
  fast: false,
  keyed: false,
};

/** What the scene asks of the shell, and tells it. */
export interface WallSceneOptions {
  /** Moves the game on by the time a frame took, the shot steered as the player steers it. */
  readonly tick: (deltaMs: number, steer: Readonly<Steer>) => void;
  /**
   * Returns the round in play as the view draws it at this moment, as
   * `RoundPlay`'s `view`, read once a frame after the tick. Its
   * `wallDrop` is 1 while the wall stands still; the wall that comes down
   * is handed over at once, with `wallDrop` 0, which eases it down from
   * where it stood as it goes to 1; and another wall is handed over each
   * frame a brick changes.
   */
  readonly view: () => RoundView;
  /**
   * Returns where the player's fuzzball waits on the floor, across the
   * field, or null while it is in the air, as `RoundPlay`'s `waitingX`:
   * the steering aims a pointer from there.
   */
  readonly waitingX: () => number | null;
  /**
   * Returns the boon the waiting fuzzball carries, which it wears: the
   * round aimed's while it aims, the next round's once the flight has
   * landed, from the jump that earns it, and none while it flies.
   */
  readonly boon: () => Boon | null;
  /** Returns the crew of the round aimed or in play, whose friends fly in their inks, in the order they were freed. */
  readonly crew: () => Crew;
  /** Returns the guide to draw, or null where none shows. */
  readonly guide: () => Guide | null;
  /** Returns how each kind of pointer aims, as the settings say; a new value is handed to the steering. */
  readonly aimings: () => PointerAimings;
  /** Returns the colors to draw in; a new value bakes the atlas again. */
  readonly palette: () => WallPalette;
  /** Returns the field's shape, worked out between rounds; a new value lays the field out again. */
  readonly shape: () => FieldShape;
  /** Returns whether the player welcomes motion. */
  readonly motion: () => boolean;
  /** Returns whether the player wants sound. */
  readonly sound: () => boolean;
  /** Takes where the field and its panels now lie on the canvas. */
  readonly onLayout: (metrics: FieldMetrics) => void;
  /** Takes what a key asks of the game. */
  readonly command: (command: FieldCommand) => void;
  /**
   * Takes, each time the atlas is baked, what returns a picture of every
   * kind of brick as drawn in it, for How to play and the panels; it encodes
   * them only as it is first called after the bake, so call it only as a
   * page shows them.
   */
  readonly onPictures: (pictures: () => Pictures) => void;
}

/**
 * Draws a level of Brick Fuzz Pop: reads the player's keys, mouse and
 * fingers through its `Steering`, hands the shell each frame's time and
 * steering, then pulls the round to draw, plays the sounds and flourishes
 * of each event and beat it reached since the last frame, once each, and
 * draws the field, the wall, the guide, the fuzzballs and the meter as
 * they stand; a key the steering doesn't take becomes a command.
 */
export class WallScene extends Scene {
  /** The key the scene is registered under, which no other shares. */
  readonly key: string;

  /** Draws the field, its band, its lintel, its frame and its lines. */
  field!: FieldPainter;
  /** Draws the wall. */
  wall!: WallPainter;
  /** Draws the guide. */
  guide!: GuidePainter;
  /** Draws what bursts from the wall, the jump line's flash and the shake. */
  effects!: EffectsPainter;
  /** Draws the charge's meter. */
  meter!: MeterPainter;
  /** Draws the fuzzballs. */
  balls!: BallPainter;
  /** Plays the sounds. */
  sounds!: SpritePlayer<SoundName>;
  /** Turns the player's keys, mouse and fingers into the shot being aimed. */
  steering!: Steering;
  /** Every painter, back to front, which each frame draws, the field before the guide, which reads its count. */
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
  /** The scale the atlas was last baked at. */
  private baked!: ArtScale;
  /** The palette the atlas was last baked in. */
  private painted!: WallPalette;
  /** The canvas the field was last laid out on. */
  private canvas!: Viewport;
  /** How each kind of pointer aims, as the steering was last told. */
  private aimed!: PointerAimings;
  /** Where the player's fuzzball last waited, across the field, which the steering aims a pointer from while it flies. */
  private from: number = FIRST_X;
  /** The charge the steering last read, whose every rise and fall ticks. */
  private charged = 0;
  /** The view's log of events played from, and the latest of its events played. */
  private eventLog: EventLogView<LoggedEvent> | null = null;
  private played = 0;
  /** The view's log of beats played from, and the latest of its beats played. */
  private beatLog: EventLogView<LoggedBeat> | null = null;
  private beaten = 0;
  /** Gathers the sounds a frame's events and beats call for, so each plays once. */
  private readonly frameSounds = createFrameSounds();
  /** Where a fuzzball looks, read for a punch's streak. */
  private readonly look = { x: 0, y: 1 };

  constructor(
    private readonly options: WallSceneOptions,
    private readonly surroundings: SceneSurroundings,
  ) {
    const key = uniqueSceneKey("wall-scene");
    super(key);
    this.key = key;
  }

  /**
   * Measures, bakes the atlas, builds the field in its layers, back to
   * front, makes the steering, and starts listening, the events and beats
   * the view has already reached left unplayed.
   */
  create(): void {
    const { options } = this;
    this.painted = options.palette();
    this.measure();
    this.bake();
    const layers = this.layers();
    this.field = new FieldPainter(this, layers);
    this.wall = new WallPainter(this, layers.wall);
    this.guide = new GuidePainter(this, layers.guide, this.field);
    this.effects = new EffectsPainter(this, layers);
    this.meter = new MeterPainter(this, layers.balls);
    this.balls = new BallPainter(this, layers.balls);
    this.painters = [
      this.field,
      this.wall,
      this.guide,
      this.effects,
      this.meter,
      this.balls,
    ];
    this.effects.layout(this.metrics);
    this.steering = new Steering(this.metrics, this.canvas);
    this.aimed = options.aimings();
    this.steering.aimWith(this.aimed);
    this.from = options.waitingX() ?? FIRST_X;
    const view = options.view();
    this.follow(view);
    this.context = {
      view,
      steer: UNSTEERED,
      waitingX: options.waitingX(),
      boon: options.boon(),
      guide: options.guide(),
      shape: this.laidOut,
      metrics: this.metrics,
      baked: this.baked,
      palette: this.painted,
      now: 0,
      motion: options.motion(),
    };
    this.sounds = new SpritePlayer(this, {
      key: "wall-sounds",
      spritemap,
      url: spriteUrl,
    });
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
   * steering, then plays what the round reached since the last frame, once
   * each, and draws the round as the view now has it.
   *
   * It allocates nothing of its own but on a new layout or a new palette,
   * and once for each fuzzball of a round past the most a round has had;
   * Phaser makes a sound object for each sound it plays.
   */
  override update(time: number, delta: number): void {
    const { options, context } = this;
    context.now = time;
    let stale = this.fit();
    this.aim();
    const steer = this.steering.read(delta, this.from);
    options.tick(delta, steer);
    this.sounds.follow(options.sound());
    const palette = options.palette();
    // The tick may have reshaped the field, between rounds.
    stale = this.fit() || stale;
    if (palette !== this.painted) {
      this.painted = palette;
      stale = true;
    }
    if (stale) this.rebake();
    const view = options.view();
    context.view = view;
    context.steer = steer;
    context.waitingX = options.waitingX();
    context.boon = options.boon();
    context.motion = options.motion();
    this.follow(view);
    view.events.forEachSince(this.played, this.playEvent);
    this.played = view.events.latest;
    view.beats.forEachSince(this.beaten, this.playBeat);
    this.beaten = view.beats.latest;
    this.hearNotch(steer);
    this.frameSounds.playEach(this.sounds.playRisen);
    this.draw();
  }

  /** Has each painter draw the field as it stands, in its layer. */
  private draw(): void {
    const context = this.context;
    context.guide = this.options.guide();
    context.shape = this.laidOut;
    context.metrics = this.metrics;
    context.baked = this.baked;
    context.palette = this.painted;
    for (const painter of this.painters) painter.draw(context);
  }

  /**
   * Hands the steering how each kind of pointer aims, as the settings now
   * say, and keeps where the fuzzball waits, which it aims a pointer from
   * while the fuzzball flies too.
   */
  private aim(): void {
    const aimings = this.options.aimings();
    if (aimings !== this.aimed) {
      this.aimed = aimings;
      this.steering.aimWith(aimings);
    }
    this.from = this.options.waitingX() ?? this.from;
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

  /** Hears the notch of each charge the steering rises or falls to, but none, while a fuzzball waits to be let fly at it. */
  private hearNotch({ charge }: Readonly<Steer>): void {
    if (charge === this.charged) return;
    this.charged = charge;
    const { waitingX, boon } = this.context;
    if (charge > 0 && waitingX !== null && boon !== "hot") {
      this.hear(beatEffectsOf("notch"), 0);
    }
  }

  /**
   * Plays an event: follows a fuzzball's heading and a friend's ink, keeps
   * the sound the event calls for to play with the frame's others, and
   * plays the flourishes it calls for where motion is welcome.
   *
   * Made once, as the event log takes it each frame.
   */
  private readonly playEvent = ({
    event,
    effects,
  }: Readonly<LoggedEvent>): void => {
    switch (event.kind) {
      case "launch":
        this.balls.launch(event, this.options.crew());
        break;
      case "turn":
        this.balls.head(event.ball, event.dx, event.dy);
        break;
      case "yawn":
        // A bored fuzzball drops to the floor from where it is.
        this.balls.head(event.ball, 0, -1);
        break;
      default:
        break;
    }
    this.hear(effects, detuneOf(event));
    for (const flourish of flourishesOf(effects, this.context.motion)) {
      this.flourish(flourish, event);
    }
  };

  /**
   * Plays a beat of the round: keeps its sound, and plays its flourishes
   * where motion is welcome.
   *
   * Made once, as the beat log takes it each frame.
   */
  private readonly playBeat = ({ beat }: Readonly<LoggedBeat>): void => {
    const effects = beatEffectsOf(beat);
    this.hear(effects, 0);
    for (const flourish of flourishesOf(effects, this.context.motion)) {
      this.flourish(flourish, null);
    }
  };

  /** Keeps the sound some effects call for, risen by some cents, to play with the frame's others. */
  private hear({ sound }: EventEffects, detune: number): void {
    if (sound) this.frameSounds.hear(sound, detune);
  }

  /**
   * Plays one of an event's or a beat's flourishes, on what the event
   * says, where its brick shows: on the wall drawn the frame before, as
   * the frame that reaches a flight's last events hands over the wall that
   * comes down, a step or a jump under where the flight's still shows. One
   * that has no place on what it is played for, as a swell on no strike,
   * plays nothing.
   */
  private flourish(
    flourish: Flourish,
    event: Readonly<FlightEvent> | null,
  ): void {
    const { now } = this.context;
    const wall = this.wall.drawnWall() ?? this.context.view.wall;
    switch (flourish) {
      case "flash":
        this.effects.flashLine(now);
        return;
      case "flare":
        this.balls.flare(now);
        return;
      case "shake":
        this.effects.shake(now);
        return;
      case "swell":
        if (event?.kind === "strike") this.wall.swell(wall, event.cell, now);
        return;
      case "shards":
        if (event?.kind === "break") this.shatter(wall, event.cell);
        return;
      case "streak":
        if (event?.kind === "strike") {
          const { x, y } = this.balls.lookOf(event.ball, this.look);
          this.effects.streak(
            columnOf(event.cell) + 0.5,
            fieldRowOf(wall, event.cell) + 0.5,
            x,
            y,
            now,
          );
        }
        return;
      case "bolt":
        if (event?.kind === "zap") {
          this.effects.zap(
            wall,
            event.cell,
            event.reaches,
            this.laidOut.depth,
            now,
          );
        }
        return;
      case "ring":
        if (event?.kind === "zap") {
          this.effects.ring(
            columnOf(event.cell) + 0.5,
            fieldRowOf(wall, event.cell) + 0.5,
            now,
          );
        }
        return;
      case "hop":
        if (event?.kind === "free") {
          this.effects.hop(
            columnOf(event.cell) + 0.5,
            fieldRowOf(wall, event.cell) + 0.5,
            event.ink,
            now,
          );
        }
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
      brickColor(brick, this.painted),
      this.metrics,
    );
  }

  /** Returns a layer for each entry of the list, made back to front. */
  private layers(): Readonly<Record<Layer, GameObjects.Layer>> {
    return recordOf(LAYERS, () => this.add.layer());
  }

  /**
   * Lays the field out again if the canvas, the chrome over it or its shape
   * changed, and returns whether the atlas must be baked again: at a new
   * scale.
   */
  private fit(): boolean {
    if (!this.moved() || !this.measure()) return false;
    this.options.onLayout(this.metrics);
    this.steering.measure(this.metrics, this.canvas);
    this.effects.layout(this.metrics);
    const scale = bakedScaleOf(this.metrics);
    return (
      scale.unit !== this.baked.unit ||
      scale.pixelRatio !== this.baked.pixelRatio
    );
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
   * Bakes the atlas at the field's scale, in the palette, and hands the
   * shell what pictures it for How to play.
   */
  private bake(): void {
    this.baked = bakedScaleOf(this.metrics);
    bakeWallAtlas(this, this.painted, this.baked);
    this.options.onPictures(picturesWhenAsked(this, ATLAS, PICTURE_FRAMES));
  }

  /** Bakes the atlas again, and has every image take up its frame anew. */
  private rebake(): void {
    this.bake();
    retakeFrames(this, ATLAS);
  }

  /**
   * Hands the keys, the mouse, its wheel and the fingers to the steering, a
   * pointer let go past the canvas too, turns the keys it doesn't take into
   * commands, and lets go of every key and finger as the player looks
   * away, so none sticks and no charge builds on.
   */
  private listen(): void {
    const { steering } = this;
    this.input.keyboard?.addCapture(CAPTURED_KEYS);
    onKeyDown(this, (event) => {
      this.press(event);
    });
    onKeyUp(this, (event) => {
      steering.keyUp(event.code);
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
      steering.letGo();
    });
  }

  /**
   * Hands a key pressed to the steering, and passes on what one it doesn't
   * take asks, once per press, leaving the browser its shortcuts.
   */
  private press(event: KeyboardEvent): void {
    if (isShortcut(event)) return;
    if (this.steering.keyDown(event)) return;
    if (event.repeat) return;
    const command = commandOfKey(event.code);
    if (command) this.options.command(command);
  }
}

/** Returns what builds a Brick Fuzz Pop scene, for the canvas to show. */
export function makeWallScene(
  options: WallSceneOptions,
): (surroundings: SceneSurroundings) => WallScene {
  return (surroundings) => new WallScene(options, surroundings);
}
