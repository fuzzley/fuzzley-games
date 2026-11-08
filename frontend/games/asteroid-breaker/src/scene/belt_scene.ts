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
import type { ArtScale } from "@fz/phaser/shapes";
import { SpritePlayer } from "@fz/phaser/sound";
import { type Cameras, Core, type GameObjects, Input, Scene } from "phaser";
import type { Torus } from "../rules/torus";
import { PICTURE_FRAMES, type Pictures, mapPictures } from "../view/art/art";
import {
  type FieldCommand,
  commandOfKey,
  heldKeyOf,
} from "../view/steering/controls";
import { type Deck, deckOf } from "../view/steering/deck";
import {
  type SoundName,
  THRUST,
  createFrameSounds,
  detuneOf,
  effectsOf,
  flourishesOf,
} from "../view/effects/effects";
import {
  type BoardSetting,
  type FieldMetrics,
  fieldMetrics,
} from "../view/field/field_metrics";
import type {
  FieldEvent,
  FieldFrame,
  FieldView,
  Steer,
} from "../view/field/frame";
import { LAYERS, type Layer } from "../view/field/layers";
import type { BeltPalette } from "../view/colors/palette";
import { bakedScale } from "../view/art/shapes";
import { MOST_FINGERS, Steering } from "../view/steering/steering";
import { ATLAS, bakeBeltAtlas, bakeDeckAtlas } from "./atlas";
import { FieldCamera } from "./field_camera";
import { FlourishPlayer } from "./flourish_player";
import { DebrisPainter } from "./painters/debris_painter";
import { DeckPainter } from "./painters/deck_painter";
import { ExhaustPainter } from "./painters/exhaust_painter";
import { FieldPainter } from "./painters/field_painter";
import { HazardPainter } from "./painters/hazard_painter";
import type { PaintContext, Painter } from "./painters/painter";
import { PickupPainter } from "./painters/pickup_painter";
import { PointsPainter } from "./painters/points_painter";
import { RingPainter } from "./painters/ring_painter";
import { RockPainter } from "./painters/rock_painter";
import { ShipPainter } from "./painters/ship_painter";
import { ShotPainter } from "./painters/shot_painter";
import { StrayPainter } from "./painters/stray_painter";
import { TagPainter } from "./painters/tag_painter";
import { TrailPainter } from "./painters/trail_painter";
import spritemap from "./sounds/sounds.json";
import spriteUrl from "./sounds/sounds.wav?url";

/** Names the sounds' sprite in Phaser's caches. */
export const SOUNDS_KEY = "belt-sounds";

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
  /** Returns whether the player wants sound. */
  readonly sound: () => boolean;
  /** Returns whether the ship thrusts while its wave plays on, which the thrust's hum follows. */
  readonly thrusting: () => boolean;
  /** Returns how the board lays the field and the deck out; a new value lays them out again. */
  readonly board: () => BoardSetting;
  /**
   * Takes the canvas as the field was last laid out on it, which the next
   * field is shaped for, and where the field now lies on it, in CSS pixels.
   */
  readonly onLayout: (viewport: Viewport, field: CssRect) => void;
  /** Takes what a key asks of the game. */
  readonly command: (command: FieldCommand) => void;
  /**
   * Takes a picture of every rock kind, pickup, a stray and the comet as drawn,
   * for How to play, each time they are drawn anew.
   */
  readonly onPictures: (pictures: Pictures) => void;
}

/** The keys the browser would otherwise scroll the page by, in Phaser's names. */
const CAPTURED_KEYS = "LEFT,RIGHT,UP,DOWN,SPACE";

/** The layers the field's camera draws, every one but the frame's and the deck's. */
const FIELD_LAYERS = LAYERS.filter(
  (layer) => layer !== "frame" && layer !== "deck",
);

/** Holds what the scene draws and sounds with, each made once, as it is created. */
export interface BeltKit {
  /** Draws the specks and the frame. */
  readonly field: FieldPainter;
  /** Draws the tags of the effects in play. */
  readonly tags: TagPainter;
  /** Draws the rocks. */
  readonly rocks: RockPainter;
  /** Draws the pickups. */
  readonly pickups: PickupPainter;
  /** Draws the stray adrift and a lost ship's pilot bailing out. */
  readonly strays: StrayPainter;
  /** Draws the comets and their warnings. */
  readonly hazards: HazardPainter;
  /** Draws the shots. */
  readonly shots: ShotPainter;
  /** Draws the ship, its pilot and its rings. */
  readonly ship: ShipPainter;
  /** Draws a dash's trail. */
  readonly trail: TrailPainter;
  /** Streams the exhaust off the flame. */
  readonly exhaust: ExhaustPainter;
  /** Draws what flies off a rock or a ship as it is hit: shards, dust and sparks. */
  readonly debris: DebrisPainter;
  /** Draws the rings that sweep out. */
  readonly rings: RingPainter;
  /** Draws the points scored. */
  readonly points: PointsPainter;
  /** Draws the deck, over the whole canvas. */
  readonly deck: DeckPainter;
  /** Points the field's camera at the field, fills it, and kicks and shakes it. */
  readonly fieldCamera: FieldCamera;
  /** Draws the frame and the deck, over the whole canvas. */
  readonly deckCamera: Cameras.Scene2D.Camera;
  /** Plays the sounds. */
  readonly sounds: SpritePlayer<SoundName>;
}

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

  private madeKit: BeltKit | null = null;
  /**
   * Every painter, back to front, and the field's camera, which each frame
   * draws, each new field starts and each bake refreshes.
   */
  private painters!: readonly Painter[];
  /** Plays each event's flourishes on the painters and the field's camera. */
  private flourishPlayer!: FlourishPlayer;
  /**
   * What each frame's flourishes play from and its painters draw from, which
   * the scene writes over.
   */
  private context!: PaintContext;
  /** Turns the keys, the mouse and the fingers into each frame's steering. */
  private steering!: Steering;

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
  /** The sounds this frame's events call for, played once each after them. */
  private readonly frameSounds = createFrameSounds();

  constructor(
    private readonly options: BeltSceneOptions,
    private readonly surroundings: SceneSurroundings,
  ) {
    const key = `belt-scene-${String(++BeltScene.built)}`;
    super(key);
    this.key = key;
  }

  /**
   * What the scene draws and sounds with, each made once, as it is created.
   *
   * @throws {Error} Before the scene is created.
   */
  get kit(): BeltKit {
    if (!this.madeKit) throw new Error("BeltScene has no kit before create().");
    return this.madeKit;
  }

  /**
   * Measures, bakes the atlases, builds the field in its layers, back to front,
   * sets the cameras up and starts listening.
   */
  create(): void {
    this.painted = this.options.palette();
    this.measure();
    this.bake();
    this.steering = new Steering(this.metrics, this.deckParts, this.board);
    const layers = recordOf(LAYERS, () => this.add.layer());
    const kit = this.makeKit(layers, this.steering);
    this.madeKit = kit;
    this.cameras.main.ignore([layers.frame, layers.deck]);
    kit.deckCamera.ignore(FIELD_LAYERS.map((layer) => layers[layer]));
    this.painters = [
      kit.field,
      kit.tags,
      kit.rocks,
      kit.pickups,
      kit.strays,
      kit.hazards,
      kit.shots,
      kit.ship,
      kit.trail,
      kit.exhaust,
      kit.debris,
      kit.rings,
      kit.points,
      kit.deck,
      kit.fieldCamera,
    ];
    this.flourishPlayer = new FlourishPlayer({
      debris: kit.debris,
      rings: kit.rings,
      trail: kit.trail,
      rocks: kit.rocks,
      points: kit.points,
      strays: kit.strays,
      camera: kit.fieldCamera,
    });
    const frame = this.options.frame();
    this.startField(frame.field);
    this.context = {
      field: frame.field,
      alpha: frame.alpha,
      seed: frame.seed,
      constellation: frame.constellation,
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
   * Makes each painter in its layers, the field camera's painter, the deck's
   * camera and the sounds, in the order listed: each object joins its layer
   * as it is made, so the effects layer's flourishes go in back to front, as
   * `layers.ts` lists them.
   */
  private makeKit(
    layers: Readonly<Record<Layer, GameObjects.Layer>>,
    steering: Steering,
  ): BeltKit {
    return {
      field: new FieldPainter(this, layers),
      tags: new TagPainter(this, layers.tags),
      rocks: new RockPainter(this, layers.rocks, layers.effects),
      pickups: new PickupPainter(this, layers.pickups),
      strays: new StrayPainter(this, layers.strays),
      hazards: new HazardPainter(this, layers.hazards),
      shots: new ShotPainter(this, layers.shots),
      ship: new ShipPainter(this, layers.ship),
      trail: new TrailPainter(this, layers.effects),
      exhaust: new ExhaustPainter(this, layers.effects),
      debris: new DebrisPainter(this, layers.effects),
      rings: new RingPainter(this, layers.effects),
      points: new PointsPainter(
        this,
        layers.points,
        // The page's font, which the canvas takes from the board around it.
        getComputedStyle(this.game.canvas).fontFamily || "sans-serif",
      ),
      deck: new DeckPainter(this, layers.deck, steering),
      fieldCamera: new FieldCamera(this.cameras.main),
      // Over the whole canvas, which Phaser keeps it to as the canvas changes
      // size.
      deckCamera: this.cameras.add(),
      sounds: new SpritePlayer(this, {
        key: SOUNDS_KEY,
        spritemap,
        url: spriteUrl,
      }),
    };
  }

  /**
   * Hands the shell the time the frame took and the steering, then plays
   * what happened on the field since the last frame, once each, hums while
   * the ship thrusts, and draws the field as it now stands.
   *
   * It allocates nothing of its own but on a new layout, a new palette or a
   * new wave; Phaser makes a sound object for each sound it plays.
   */
  override update(time: number, delta: number): void {
    this.context.now = time;
    let stale = this.fit();
    this.options.tick(delta, this.steering.read());
    this.kit.sounds.follow(this.options.sound());
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
    this.stage(frame);
    frame.events.forEachSince(this.played, this.play);
    this.played = frame.events.latest;
    this.frameSounds.playEach(this.kit.sounds.playRisen);
    this.kit.sounds.hold(THRUST, this.options.thrusting());
    for (const painter of this.painters) painter.draw(this.context);
  }

  /**
   * Plays what an event calls for, once, for `forEachSince()`, which takes
   * it each frame: keeps its sound to play with the frame's others, and
   * plays its flourishes where motion is welcome, and its points either way.
   */
  private readonly play = (event: Readonly<FieldEvent>): void => {
    const effects = effectsOf(event);
    if (effects.sound) this.frameSounds.hear(effects.sound, detuneOf(event));
    const flourishes = flourishesOf(effects, this.context.motion);
    for (const flourish of flourishes) {
      this.flourishPlayer.play(flourish, event, this.context);
    }
  };

  /**
   * Writes the frame, and how the scene now lays the field out and paints
   * it, into the context the frame's flourishes play from and its painters
   * draw from.
   */
  private stage({ field, alpha, seed, constellation }: FieldFrame): void {
    const context = this.context;
    context.field = field;
    context.alpha = alpha;
    context.seed = seed;
    context.constellation = constellation;
    context.deck = this.deckParts;
    context.metrics = this.metrics;
    context.palette = this.painted;
    context.zoom = this.zoom();
  }

  /**
   * Returns how much larger the field draws than its atlas was baked: its unit
   * over the baked unit.
   */
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

  /**
   * Returns whether the canvas, its pixel ratio, the chrome over it, the
   * board's setting or the field's size changed.
   */
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

  /**
   * Points the field's camera at the field as measured, hands the steering
   * the layout, and tells the shell where the field lies.
   */
  private layOut(): void {
    this.kit.fieldCamera.fit(this.metrics);
    this.steering.measure(this.metrics, this.deckParts, this.board);
    if (this.viewport) this.options.onLayout(this.viewport, this.metrics.css);
  }

  /**
   * Bakes the field's atlas at its scale, in the palette, and the deck's on a
   * new pixel ratio, and hands How to play its pictures.
   */
  private bake(): void {
    this.baked = bakedScale(this.metrics);
    bakeBeltAtlas(this, this.painted, this.baked);
    if (this.deckBaked !== this.metrics.pixelRatio) {
      this.deckBaked = this.metrics.pixelRatio;
      bakeDeckAtlas(this, this.deckBaked);
    }
    this.options.onPictures(
      mapPictures(PICTURE_FRAMES, (frame) =>
        this.textures.getBase64(ATLAS, frame),
      ),
    );
  }

  /** Bakes the atlases again, and has every image take up its frame anew. */
  private rebake(): void {
    this.bake();
    for (const painter of this.painters) painter.refresh?.();
  }

  /**
   * Starts drawing a new field, from its first event, stopping what the
   * last one set off, and making the images it needs that the last didn't.
   */
  private startField(field: FieldView): void {
    this.shownField = field;
    this.played = 0;
    for (const painter of this.painters) painter.start?.(field);
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

  /**
   * Lets go of every key and finger as the window, the page or the field loses
   * the player, so none sticks.
   */
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
