import { recordOf } from "@fz/core/records";
import type { SceneSurroundings } from "@fz/phaser/host";
import { type Insets, NO_INSETS } from "@fz/phaser/insets";
import type { CssRect, Viewport } from "@fz/phaser/layout";
import {
  onFirstFrame,
  onKeyDown,
  onKeyUp,
  pixelRatioOf,
  whenSceneEnds,
} from "@fz/phaser/scene";
import { type Cameras, Core, type GameObjects, Input, Scene } from "phaser";
import type { Torus } from "../rules/torus";
import { ROCK_RADIUS } from "../rules/tuning";
import { PICTURE_FRAMES, type Pictures, mapPictures } from "../view/art";
import { type FieldCommand, commandOfKey, heldKeyOf } from "../view/controls";
import { type Deck, deckOf } from "../view/deck";
import {
  type Flourish,
  effectsOf,
  flourishesOf,
  rockKindOf,
  rockSizeOf,
} from "../view/effects";
import {
  type BoardSetting,
  type FieldMetrics,
  fieldMetrics,
} from "../view/field_metrics";
import { ringColorOf, ringReachOf, shardCount, wayOf } from "../view/flourish";
import type { FieldEvent, FieldFrame, FieldView, Steer } from "../view/frame";
import { LAYERS, type Layer } from "../view/layers";
import type { BeltPalette } from "../view/palette";
import { type ArtScale, bakedScale } from "../view/shapes";
import { MOST_FINGERS, Steering } from "../view/steering";
import { BURST_SHARDS } from "../view/timing";
import { ATLAS, bakeBeltAtlas, bakeDeckAtlas } from "./atlas";
import { DeckPainter } from "./deck_painter";
import { EffectsPainter } from "./effects_painter";
import { FieldPainter } from "./field_painter";
import { HazardPainter } from "./hazard_painter";
import type { PaintContext, Painter } from "./painter";
import { PickupPainter } from "./pickup_painter";
import { PointsPainter } from "./points_painter";
import { RockPainter } from "./rock_painter";
import { ShipPainter } from "./ship_painter";
import { ShotPainter } from "./shot_painter";
import { StrayPainter } from "./stray_painter";
import { TagPainter } from "./tag_painter";

/** What the scene asks of the shell, and tells it. */
export interface BeltSceneOptions {
  /** Moves the game on by the time a frame took, the ship steered as the player steers it. */
  readonly tick: (deltaMs: number, steer: Readonly<Steer>) => void;
  /** Returns the field to draw, as the game now stands. */
  readonly frame: () => FieldFrame;
  /** Returns the colors to draw in; a new value repaints the field. */
  readonly palette: () => BeltPalette;
  /** Returns whether the player welcomes motion. */
  readonly motion: () => boolean;
  /** Returns how the board lays the field and the deck out; a new value lays them out again. */
  readonly board: () => BoardSetting;
  /**
   * Takes the canvas as the field was last laid out on it, which the next
   * field is shaped for, and where the field now lies on it, in CSS pixels.
   */
  readonly onLayout: (viewport: Viewport, field: CssRect) => void;
  /** Takes what a key asks of the game. */
  readonly command: (command: FieldCommand) => void;
  /** Takes a picture of every rock kind, pickup, a stray and the comet as drawn, for How to play, each time they are drawn anew. */
  readonly onPictures: (pictures: Pictures) => void;
}

/** The keys the browser would otherwise scroll the page by, in Phaser's names. */
const CAPTURED_KEYS = "LEFT,RIGHT,UP,DOWN,SPACE";

/** The layers the field's camera draws, every one but the frame's and the deck's. */
const FIELD_LAYERS = LAYERS.filter(
  (layer) => layer !== "frame" && layer !== "deck",
);

/**
 * Draws a wave of Asteroid Breaker, handing the shell each frame's time and
 * steering before pulling the field to draw, and turns keys into commands.
 *
 * Two cameras draw it: the field's, whose viewport is the field's
 * rectangle, so whatever lies past an edge is cut off there, and the
 * deck's, over the whole canvas, which draws the frame and the deck alone,
 * so they stay still as the field shakes.
 */
export class BeltScene extends Scene {
  /** How many scenes have been built, which numbers each one's key. */
  private static built = 0;

  /** The key the scene is registered under, which no other shares. */
  readonly key: string;

  /** Draws the specks and the frame. */
  field!: FieldPainter;
  /** Draws the tags of the effects in play. */
  tags!: TagPainter;
  /** Draws the rocks. */
  rocks!: RockPainter;
  /** Draws the pickups. */
  pickups!: PickupPainter;
  /** Draws the stray adrift and a lost ship's pilot bailing out. */
  strays!: StrayPainter;
  /** Draws the comets and their warnings. */
  hazards!: HazardPainter;
  /** Draws the shots. */
  shots!: ShotPainter;
  /** Draws the ship, its pilot and its rings. */
  ship!: ShipPainter;
  /** Draws what bursts from the field as things happen on it, and kicks and shakes it. */
  effects!: EffectsPainter;
  /** Draws the points scored. */
  points!: PointsPainter;
  /** Draws the deck, over the whole canvas. */
  deck!: DeckPainter;
  /** Draws the frame and the deck, over the whole canvas. */
  deckCamera!: Cameras.Scene2D.Camera;

  /** Every painter, back to front, which each frame draws and each bake refreshes. */
  private painters: readonly Painter[] = [];
  /** What the painters draw each frame from, which the scene writes over. */
  private context!: PaintContext;
  /** Turns the keys, the mouse and the fingers into each frame's steering. */
  private steering!: Steering;
  /** The layers the field is drawn in, back to front. */
  private layers!: Readonly<Record<Layer, GameObjects.Layer>>;

  /** The canvas as the field was last laid out on it. */
  private viewport: Viewport | null = null;
  /** The chrome over the canvas as the field was last laid out, in CSS pixels. */
  private chrome: Insets = NO_INSETS;
  /** How the board laid the field and the deck out as they were last laid out. */
  private board!: BoardSetting;
  /** The field's size as it was last laid out. */
  private torus!: Torus;
  private metrics!: FieldMetrics;
  /** Where the deck's parts lie, or null where it doesn't show. */
  private deckParts: Deck | null = null;
  /** The scale the field's atlas was last baked at. */
  private baked: ArtScale | null = null;
  /** The pixel ratio the deck's atlas was last baked at. */
  private deckBaked = 0;
  /** The palette the atlas was last baked in. */
  private painted!: BeltPalette;
  /** The field the scene draws, which a new wave replaces. */
  private shownField!: FieldView;
  /** The serial of the last event of the field the scene played. */
  private played = 0;

  constructor(
    private readonly options: BeltSceneOptions,
    private readonly surroundings: SceneSurroundings,
  ) {
    const key = `belt-scene-${String(++BeltScene.built)}`;
    super(key);
    this.key = key;
  }

  /** Measures, bakes the atlases, builds the field in its layers, back to front, sets the cameras up and starts listening. */
  create(): void {
    this.painted = this.options.palette();
    this.measure();
    this.bake();
    this.steering = new Steering(this.metrics, this.deckParts, this.board);
    this.layers = recordOf(LAYERS, () => this.add.layer());
    this.field = new FieldPainter(this, this.layers);
    this.tags = new TagPainter(this, this.layers.tags);
    this.rocks = new RockPainter(this, this.layers.rocks, this.layers.effects);
    this.pickups = new PickupPainter(this, this.layers.pickups);
    this.strays = new StrayPainter(this, this.layers.strays);
    this.hazards = new HazardPainter(this, this.layers.hazards);
    this.shots = new ShotPainter(this, this.layers.shots);
    this.ship = new ShipPainter(this, this.layers.ship);
    this.effects = new EffectsPainter(
      this,
      this.layers.effects,
      this.cameras.main,
    );
    this.points = new PointsPainter(
      this,
      this.layers.points,
      // The page's font, which the canvas takes from the board around it.
      getComputedStyle(this.game.canvas).fontFamily || "sans-serif",
    );
    this.deck = new DeckPainter(this, this.layers.deck, this.steering);
    this.painters = [
      this.field,
      this.tags,
      this.rocks,
      this.pickups,
      this.strays,
      this.hazards,
      this.shots,
      this.ship,
      this.effects,
      this.points,
      this.deck,
    ];
    this.cameras.main.ignore([this.layers.frame, this.layers.deck]);
    // Over the whole canvas, which Phaser keeps it to as the canvas changes size.
    this.deckCamera = this.cameras.add();
    this.deckCamera.ignore(FIELD_LAYERS.map((layer) => this.layers[layer]));
    const { field, alpha, seed } = this.options.frame();
    this.startField(field);
    this.context = {
      field,
      alpha,
      seed,
      deck: this.deckParts,
      metrics: this.metrics,
      palette: this.painted,
      zoom: this.zoom(),
      now: 0,
      motion: this.options.motion(),
    };
    // The game outlives the scene, so a scene built after another adds none.
    this.input.addPointer(
      Math.max(0, MOST_FINGERS - this.input.manager.pointersTotal),
    );
    this.layOut();
    this.listen();
    onFirstFrame(this, () => {
      this.surroundings.ready();
    });
  }

  /**
   * Hands the shell the time the frame took and the steering, then draws
   * the field as it now stands.
   *
   * It allocates nothing of its own but on a new layout, a new palette or a
   * new wave.
   */
  override update(time: number, delta: number): void {
    this.context.now = time;
    let stale = this.fit();
    this.options.tick(delta, this.steering.read());
    const frame = this.options.frame();
    const palette = this.options.palette();
    this.context.motion = this.options.motion();
    // The tick may have started a wave on a field of a new shape.
    stale = this.fit() || stale;
    if (palette !== this.painted) {
      this.painted = palette;
      stale = true;
    }
    if (stale) this.rebake();
    if (frame.field !== this.shownField) this.startField(frame.field);
    frame.events.forEachSince(this.played, this.play);
    this.played = frame.events.latest;
    this.draw(frame);
  }

  /** Plays what an event calls for, once, for `forEachSince()`, which takes it each frame: its flourishes where motion is welcome, and its points either way. */
  private readonly play = (event: Readonly<FieldEvent>): void => {
    const flourishes = flourishesOf(effectsOf(event), this.context.motion);
    for (const flourish of flourishes) {
      this.flourish(flourish, event, this.shownField);
    }
  };

  /** Plays one of an event's flourishes on the field it happened on. */
  private flourish(
    flourish: Flourish,
    event: Readonly<FieldEvent>,
    field: FieldView,
  ): void {
    const { now } = this.context;
    const palette = this.painted;
    const { x, y } = event;
    switch (flourish) {
      case "shards":
        this.effects.shatter(
          x,
          y,
          palette.rocks[rockKindOf(event)],
          shardCount(event.serial),
          this.metrics,
          this.zoom(),
        );
        return;
      case "dust":
        this.effects.puff(
          x,
          y,
          ROCK_RADIUS[rockSizeOf(event)],
          palette.rocks[rockKindOf(event)],
          now,
        );
        return;
      case "kick":
        this.effects.kick(event.wayX, event.wayY, now);
        return;
      case "flash":
        this.rocks.flashSlot(event.slot, now);
        return;
      case "spark":
        this.effects.spark(
          x,
          y,
          ROCK_RADIUS[rockSizeOf(event)],
          wayOf(event.serial),
          palette.flame,
          now,
        );
        return;
      case "ring":
        this.effects.ring(
          x,
          y,
          ringReachOf(event),
          ringColorOf(event, palette),
          now,
        );
        return;
      case "points":
        this.points.show(event, now);
        return;
      case "trail":
        this.effects.trailDash(x, y, event.wayX, event.wayY, field.steps);
        return;
      case "burst":
        this.effects.shatter(
          x,
          y,
          palette.accent,
          BURST_SHARDS,
          this.metrics,
          this.zoom(),
        );
        return;
      case "bailout":
        if (event.pilot !== null) {
          this.strays.bailOut(x, y, event.pilot, wayOf(event.serial), now);
        }
        return;
      case "shake":
        this.effects.shake(now);
        return;
    }
  }

  /** Has each painter draw the field as it stands, in its layer. */
  private draw({ field, alpha, seed }: FieldFrame): void {
    const context = this.context;
    context.field = field;
    context.alpha = alpha;
    context.seed = seed;
    context.deck = this.deckParts;
    context.metrics = this.metrics;
    context.palette = this.painted;
    context.zoom = this.zoom();
    for (const painter of this.painters) painter.draw(context);
  }

  /** Returns how much larger the field draws than its atlas was baked: its unit over the baked unit. */
  private zoom(): number {
    return this.metrics.unit / (this.baked?.unit ?? this.metrics.unit);
  }

  /**
   * Lays the field out again if it moved, and returns whether the art must
   * be drawn again.
   */
  private fit(): boolean {
    if (!this.moved()) return false;
    const stale = this.measure();
    this.layOut();
    return stale;
  }

  /** Returns whether the canvas, its pixel ratio, the chrome over it, the board's setting or the field's size changed. */
  private moved(): boolean {
    const viewport = this.viewport;
    if (!viewport) return true;
    // Each wave brings a torus of its own, of the same size or not.
    const { torus } = this.options.frame().field;
    return (
      viewport.width !== this.scale.width ||
      viewport.height !== this.scale.height ||
      viewport.pixelRatio !== pixelRatioOf(this) ||
      this.chrome !== this.surroundings.insets() ||
      this.board !== this.options.board() ||
      this.torus.width !== torus.width ||
      this.torus.height !== torus.height
    );
  }

  /**
   * Works out where the field and the deck lie on the canvas as it now is,
   * and returns whether the art must be drawn again: at a new scale, or a
   * new pixel ratio.
   */
  private measure(): boolean {
    this.chrome = this.surroundings.insets();
    this.board = this.options.board();
    this.torus = this.options.frame().field.torus;
    const viewport: Viewport = {
      width: this.scale.width,
      height: this.scale.height,
      pixelRatio: pixelRatioOf(this),
      insets: this.chrome,
    };
    this.viewport = viewport;
    this.metrics = fieldMetrics(viewport, this.board, this.torus);
    this.deckParts = deckOf(viewport, this.board, this.torus);
    const scale = bakedScale(this.metrics);
    return (
      scale.unit !== this.baked?.unit ||
      scale.pixelRatio !== this.baked.pixelRatio
    );
  }

  /** Points the field's camera at the field as measured, hands the steering the layout, and tells the shell where the field lies. */
  private layOut(): void {
    const { x, y, width, height } = this.metrics;
    // The field's camera shows the canvas's own pixels, so a place on the canvas is the same in its world.
    this.cameras.main.setViewport(x, y, width, height).setScroll(x, y);
    this.steering.measure(this.metrics, this.deckParts, this.board);
    if (this.viewport) this.options.onLayout(this.viewport, this.metrics.css);
  }

  /** Bakes the field's atlas at its scale, in the palette, and the deck's on a new pixel ratio, and hands How to play its pictures. */
  private bake(): void {
    this.baked = bakedScale(this.metrics);
    bakeBeltAtlas(this, this.painted, this.baked);
    if (this.deckBaked !== this.metrics.pixelRatio) {
      this.deckBaked = this.metrics.pixelRatio;
      bakeDeckAtlas(this, this.deckBaked);
    }
    this.cameras.main.setBackgroundColor(this.painted.field);
    this.options.onPictures(
      mapPictures(PICTURE_FRAMES, (frame) =>
        this.textures.getBase64(ATLAS, frame),
      ),
    );
  }

  /** Bakes the atlases again, and has every image take up its frame anew. */
  private rebake(): void {
    this.bake();
    const baked = {
      metrics: this.metrics,
      palette: this.painted,
      zoom: this.zoom(),
    };
    for (const painter of this.painters) painter.refresh?.(baked);
  }

  /**
   * Starts drawing a new field, from its first event, stopping what the
   * last one set off, and making the images it needs that the last didn't.
   */
  private startField(field: FieldView): void {
    this.shownField = field;
    this.played = 0;
    this.effects.reset();
    this.points.reset();
    this.rocks.reset();
    this.strays.reset();
    this.rocks.fit(field.rocks.length);
    this.shots.fit(field.shots.slots.length);
  }

  /** Turns the keys, the mouse and the fingers into steering, and keys into commands. */
  private listen(): void {
    this.input.keyboard?.addCapture(CAPTURED_KEYS);
    onKeyDown(this, (event) => {
      this.press(event);
    });
    onKeyUp(this, (event) => {
      this.steering.release(event.code);
    });
    this.input.on(Input.Events.POINTER_DOWN, (pointer: Input.Pointer) => {
      if (this.steering.pointerDown(pointer)) this.options.command("go");
    });
    this.input.on(Input.Events.POINTER_MOVE, (pointer: Input.Pointer) => {
      this.steering.pointerMove(pointer);
    });
    const up = (pointer: Input.Pointer): void => {
      this.steering.pointerUp(pointer);
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
    const listened: unknown = this.game.input.keyboard?.target;
    const board = listened instanceof HTMLElement ? listened : null;
    const leave = (event: FocusEvent): void => {
      const to = event.relatedTarget;
      if (!(to instanceof Node && board?.contains(to))) letGo();
    };
    this.game.events.on(Core.Events.BLUR, letGo);
    this.game.events.on(Core.Events.HIDDEN, letGo);
    board?.addEventListener("focusout", leave);
    whenSceneEnds(this, () => {
      this.game.events.off(Core.Events.BLUR, letGo);
      this.game.events.off(Core.Events.HIDDEN, letGo);
      board?.removeEventListener("focusout", leave);
    });
  }

  /**
   * Holds a key that flies the ship, which goes on with a paused game too,
   * and passes on what any other key asks, once per press, leaving the
   * browser its shortcuts.
   */
  private press(event: KeyboardEvent): void {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (heldKeyOf(event.code)) {
      this.steering.press(event.code);
      if (!event.repeat) this.options.command("go");
      return;
    }
    if (event.repeat) return;
    const command = commandOfKey(event.code);
    if (command) this.options.command(command);
  }
}

/** Returns what builds an Asteroid Breaker scene, for the canvas to show. */
export function makeBeltScene(
  options: BeltSceneOptions,
): (surroundings: SceneSurroundings) => BeltScene {
  return (surroundings) => new BeltScene(options, surroundings);
}
