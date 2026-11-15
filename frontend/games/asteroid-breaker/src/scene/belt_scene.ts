import { isShortcut } from "@fz/core/keys";
import { recordOf } from "@fz/core/records";
import type { RunCommand } from "@fz/core/run";
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
import {
  LayerPlayer,
  type SoundLayer,
  type SoundSprite,
  SpritePlayer,
} from "@fz/phaser/sound";
import { type Cameras, type GameObjects, Input, Scene } from "phaser";
import type { Torus } from "../rules/torus";
import { PICTURE_FRAMES, type Pictures } from "../view/art/art";
import type { PointsFont } from "../view/art/points_art";
import { commandOfKey } from "../view/steering/controls";
import { type Deck, deckOf } from "../view/steering/deck";
import { effectsOf, flourishesOf } from "../view/effects/effects";
import {
  BED_NAMES,
  type BedName,
  bedPlays,
  bedsAhead,
} from "../view/effects/beds";
import {
  LODESTONE_HUM,
  SOUNDS,
  type SoundName,
  type SoundSwitches,
  type SoundTake,
  THRUST,
  isSwitchedOn,
} from "../view/effects/sounds";
import { FieldSounds, type PlaySound } from "../view/effects/field_sounds";
import type { PlaceId } from "../view/places/places";
import {
  type BoardSetting,
  type FieldLayout,
  type FieldMetrics,
  deckLayout,
  fieldMetrics,
} from "../view/field/field_metrics";
import {
  type Drawn,
  type FieldEvent,
  type FieldFrame,
  type FieldView,
  type Steer,
  shipAt,
} from "../view/field/frame";
import { LAYERS, type Layer, drawnBy } from "../view/field/layers";
import type { BeltPalette } from "../view/colors/palette";
import { farLight } from "../view/colors/rock_light";
import { isFine, rockPictures } from "../view/art/rock_art";
import { bakedScale } from "../view/art/shapes";
import { MOST_FINGERS, Steering } from "../view/steering/steering";
import {
  ATLAS,
  DECK_ATLAS,
  ROCK_ATLAS,
  bakeBeltAtlas,
  bakeDeckAtlas,
} from "./atlas";
import { FieldCamera } from "./field_camera";
import { FlourishPlayer } from "./flourish_player";
import { ArcPainter } from "./painters/arc_painter";
import { DebrisPainter } from "./painters/debris_painter";
import { DeckPainter } from "./painters/deck_painter";
import { ExhaustPainter } from "./painters/exhaust_painter";
import { FieldPainter } from "./painters/field_painter";
import { HaloPainter } from "./painters/halo_painter";
import { HazardPainter } from "./painters/hazard_painter";
import type { PaintContext, Painter } from "./painters/painter";
import { PickupPainter } from "./painters/pickup_painter";
import { PlacePainter } from "./painters/place_painter";
import { PodPainter } from "./painters/pod_painter";
import { PointsPainter } from "./painters/points_painter";
import { RingPainter } from "./painters/ring_painter";
import { RockPainter } from "./painters/rock_painter";
import { ShotPainter } from "./painters/shot_painter";
import { SparkPainter } from "./painters/spark_painter";
import { StrayPainter } from "./painters/stray_painter";
import { TagPainter } from "./painters/tag_painter";
import { TowPainter } from "./painters/tow_painter";
import { TrailPainter } from "./painters/trail_painter";
import bedEndlessM4a from "./sounds/beds/bed-endless.m4a?url";
import bedEndlessOgg from "./sounds/beds/bed-endless.ogg?url";
import bedInnerBeltM4a from "./sounds/beds/bed-inner-belt.m4a?url";
import bedInnerBeltOgg from "./sounds/beds/bed-inner-belt.ogg?url";
import bedIronReachM4a from "./sounds/beds/bed-iron-reach.m4a?url";
import bedIronReachOgg from "./sounds/beds/bed-iron-reach.ogg?url";
import bedPulseM4a from "./sounds/beds/bed-pulse.m4a?url";
import bedPulseOgg from "./sounds/beds/bed-pulse.ogg?url";
import bedShimmerM4a from "./sounds/beds/bed-shimmer.m4a?url";
import bedShimmerOgg from "./sounds/beds/bed-shimmer.ogg?url";
import bedStormM4a from "./sounds/beds/bed-storm.m4a?url";
import bedStormOgg from "./sounds/beds/bed-storm.ogg?url";
import spritemap from "./sounds/sprite.json";
import spriteM4a from "./sounds/sprite.m4a?url";
import spriteOgg from "./sounds/sprite.ogg?url";

/** Names the sounds' sprite in Phaser's caches. */
export const SOUNDS_KEY = "belt-sounds";

/**
 * The sounds' sprite, as Ogg Vorbis and, for Safari, as M4A, of which the
 * browser loads the first it plays; its map is typed by the view's takes,
 * so a take of a sound in its `SOUNDS` that the map lacks fails to compile.
 */
const SOUND_SPRITE: SoundSprite<SoundTake> = {
  key: SOUNDS_KEY,
  spritemap,
  url: [spriteOgg, spriteM4a],
};

/**
 * The beds and the layers over them, each as Ogg Vorbis and, for Safari,
 * as M4A, of which the browser loads the first it plays, by the name the
 * kit gives its file, which is its key; at the kit's level, played whole.
 */
const BEDS: Readonly<Record<BedName, SoundLayer>> = {
  "bed-inner-belt": {
    key: "bed-inner-belt",
    url: [bedInnerBeltOgg, bedInnerBeltM4a],
  },
  "bed-iron-reach": {
    key: "bed-iron-reach",
    url: [bedIronReachOgg, bedIronReachM4a],
  },
  "bed-storm": { key: "bed-storm", url: [bedStormOgg, bedStormM4a] },
  "bed-endless": { key: "bed-endless", url: [bedEndlessOgg, bedEndlessM4a] },
  "bed-pulse": { key: "bed-pulse", url: [bedPulseOgg, bedPulseM4a] },
  "bed-shimmer": { key: "bed-shimmer", url: [bedShimmerOgg, bedShimmerM4a] },
};

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
  /** Returns what of the sound the player wants, as the settings switch it. */
  readonly sound: () => SoundSwitches;
  /** Returns whether the ship thrusts while its wave plays on, which the thrust's hum follows. */
  readonly thrusting: () => boolean;
  /** Returns whether a lodestone is on the field while its wave plays on, which the lodestone's hum follows. */
  readonly lodestoneHums: () => boolean;
  /** Returns static's multiplier, how many times what is scored scores, which the layers over the bed join by. */
  readonly multiplier: () => number;
  /** Returns the place the wave after this one is played in, whose bed is fetched ahead. */
  readonly placeAfter: () => PlaceId;
  /** Returns how the board lays the field and the deck out; a new value lays them out again. */
  readonly board: () => BoardSetting;
  /**
   * Takes how the field and the deck were last laid out: the canvas, which the
   * next field is shaped for, the field's shape, where the field lies and the
   * room it fills, and where the deck's zones lie.
   */
  readonly onLayout: (layout: FieldLayout) => void;
  /** Takes what a key asks of the game. */
  readonly command: (command: RunCommand) => void;
  /**
   * Takes, each time the field's atlas is baked, what returns a picture of
   * every rock kind, pickup, a stray and the comet, for How to play: the
   * rocks' drawn lit, the rest encoded as the atlas holds them, only as it
   * is first called after the bake, so call it only as How to play shows
   * them.
   */
  readonly onPictures: (pictures: () => Pictures) => void;
  /**
   * Returns the font the points are written in, the board's; a new record
   * writes them anew, as the page loads a face of it late.
   */
  readonly font: () => PointsFont;
}

/** The keys the browser would otherwise scroll the page by, in Phaser's names. */
const CAPTURED_KEYS = "LEFT,RIGHT,UP,DOWN,SPACE";

/** Holds what the scene draws and sounds with, each made once, as it is created. */
export interface BeltKit {
  /** Paints the place behind the field. */
  readonly place: PlacePainter;
  /** Draws the frame round the field. */
  readonly field: FieldPainter;
  /** Draws the halos of what gives off light, under all that glows. */
  readonly halos: HaloPainter;
  /** Draws the tags of the effects in play. */
  readonly tags: TagPainter;
  /** Draws the rocks. */
  readonly rocks: RockPainter;
  /** Draws the pickups. */
  readonly pickups: PickupPainter;
  /** Draws the sparks broken rocks shed, and their halos. */
  readonly sparks: SparkPainter;
  /** Draws static's arcs: the zap's, with the sparks where they land, and those crawling over the hull at full static. */
  readonly arcs: ArcPainter;
  /** Draws the stray adrift and a lost ship's pilot bailing out. */
  readonly strays: StrayPainter;
  /** Draws the comets and their warnings. */
  readonly hazards: HazardPainter;
  /** Draws the shots. */
  readonly shots: ShotPainter;
  /** Draws the line in tow, those who ride it, and those knocked loose. */
  readonly tow: TowPainter;
  /** Draws the pod, its pilot, its flame and its rings. */
  readonly ship: PodPainter;
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
  /** Plays the sounds, by the view's mix. */
  readonly sounds: SpritePlayer<SoundName>;
  /** Plays the beds and the layers over them, each while the scene holds it. */
  readonly beds: LayerPlayer<BedName>;
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
  /** The key the scene is registered under, which no other shares. */
  readonly key: string;

  private madeKit: BeltKit | null = null;
  /**
   * Every painter, back to front, and the field's camera, which each frame
   * draws and each new field starts.
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
  /** How the field and the deck were last laid out, which the shell is told. */
  private layout!: FieldLayout;
  /** Where the deck's parts lie, or null where it doesn't show. */
  private deckParts: Deck | null = null;
  /** The scale the field's atlas was last baked at. */
  private baked: ArtScale | null = null;
  /** Whether the rocks were last baked with their fine marks, as the field's unit keeps them. */
  private bakedFine = false;
  /** The pixel ratio the deck's atlas was last baked at. */
  private deckBaked = 0;
  /** The palette the atlas was last baked in. */
  private painted!: BeltPalette;
  /** The field the scene draws, which a new wave replaces. */
  private shownField!: FieldView;
  /** The serial of the last event of the field the scene played. */
  private played = 0;
  /** The sounds this frame calls for, by its events and its field, played once each after them. */
  private readonly fieldSounds = new FieldSounds();
  /** Where the ship is drawn and how far it is turned, written each frame. */
  private readonly drawnShip: Drawn = { x: 0, y: 0, angle: 0 };
  /** What of the sound the player wants as of this frame, which its sounds play by. */
  private switches!: SoundSwitches;
  /** Whether the scene has drawn its first frame, before which it holds no bed, so none is fetched. */
  private firstFrameDrawn = false;
  /** The field's light, far off, which lights the rocks, made as the scene is created. */
  private sun!: GameObjects.Light;

  constructor(
    private readonly options: BeltSceneOptions,
    private readonly surroundings: SceneSurroundings,
  ) {
    const key = uniqueSceneKey("belt-scene");
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
    const kit = this.makeKit(layers);
    this.madeKit = kit;
    this.cameras.main.ignore(drawnBy("deck").map((layer) => layers[layer]));
    kit.deckCamera.ignore(drawnBy("field").map((layer) => layers[layer]));
    this.painters = [
      kit.place,
      kit.field,
      kit.halos,
      kit.tags,
      kit.rocks,
      kit.pickups,
      kit.sparks,
      kit.strays,
      kit.hazards,
      kit.shots,
      kit.tow,
      kit.ship,
      kit.trail,
      kit.exhaust,
      kit.debris,
      kit.rings,
      kit.arcs,
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
      shipDrawn: shipAt(frame.field, frame.alpha, this.drawnShip),
      seed: frame.seed,
      constellation: frame.constellation,
      place: frame.place,
      deck: this.deckParts,
      steering: this.steering,
      metrics: this.metrics,
      palette: this.painted,
      font: this.options.font(),
      zoom: this.zoom(),
      now: 0,
      motion: this.options.motion(),
    };
    // The game outlives the scene, so a scene built after another adds none.
    this.input.addPointer(
      Math.max(0, MOST_FINGERS - this.input.manager.pointersTotal),
    );
    this.lights.enable();
    this.sun = this.lights.addLight(0, 0, 1, 0xffffff, 1);
    this.layOut();
    this.listen();
    onFirstFrame(this, () => {
      this.firstFrameDrawn = true;
      this.surroundings.ready();
    });
  }

  /**
   * Makes each painter in its layers, the field camera's painter, the deck's
   * camera and the sounds, in the order listed: each object joins its layer
   * as it is made, so the effects layer's flourishes go in back to front, as
   * `layers.ts` lists them.
   */
  private makeKit(layers: Readonly<Record<Layer, GameObjects.Layer>>): BeltKit {
    // Made first, so each painter that shows halos of its own is handed it.
    const halos = new HaloPainter(this, layers.halos);
    return {
      place: new PlacePainter(this, layers.place),
      field: new FieldPainter(this, layers),
      halos,
      tags: new TagPainter(this, layers.tags),
      rocks: new RockPainter(this, layers.rocks),
      pickups: new PickupPainter(this, layers.pickups),
      sparks: new SparkPainter(this, layers.sparks, halos),
      strays: new StrayPainter(this, layers.strays),
      hazards: new HazardPainter(this, layers.hazards, layers.lanes),
      shots: new ShotPainter(this, layers.shots),
      tow: new TowPainter(this, layers.tow),
      ship: new PodPainter(this, layers.ship),
      trail: new TrailPainter(this, layers.effects),
      exhaust: new ExhaustPainter(this, layers.effects),
      debris: new DebrisPainter(this, layers.breaks, layers.effects),
      rings: new RingPainter(this, layers.effects),
      arcs: new ArcPainter(this, layers.arcs, halos),
      points: new PointsPainter(this, layers.points),
      deck: new DeckPainter(this, layers.deck),
      fieldCamera: new FieldCamera(this.cameras.main),
      // Over the whole canvas, which Phaser keeps it to as the canvas changes
      // size.
      deckCamera: this.cameras.add(),
      sounds: new SpritePlayer(this, SOUND_SPRITE, { mix: SOUNDS }),
      beds: new LayerPlayer(this, BEDS),
    };
  }

  /**
   * Hands the shell the time the frame took and the steering, then plays
   * what happened on the field since the last frame and what its field's
   * change says, by the view's rules, hums while the ship thrusts and
   * while a lodestone is on the field, holds the beds, each as the
   * player's switches say, and draws the field as it now stands.
   *
   * It allocates nothing of its own but on a new layout, a new palette, a
   * new font or a new wave; Phaser makes a buffer source for each sound it
   * plays, as Web Audio starts each only once, and a drawing context for
   * each label of points it stamps.
   */
  override update(time: number, delta: number): void {
    this.context.now = time;
    let moved = this.fit();
    this.options.tick(delta, this.steering.read());
    this.switches = this.options.sound();
    this.kit.sounds.follow(this.switches.sound);
    this.kit.sounds.followMono(this.switches.mono);
    const frame = this.options.frame();
    const palette = this.options.palette();
    this.context.motion = this.options.motion();
    // The tick may have started a wave on a field of a new shape.
    moved = this.fit() || moved;
    // The atlas is held to the field as this frame draws it, not as it was
    // laid out on the way, as a turned screen's is before the field takes
    // its new shape.
    if (palette !== this.painted || (moved && !this.isBakedForLayout())) {
      this.painted = palette;
      this.rebake();
    }
    if (frame.field !== this.shownField) this.startField(frame.field);
    this.stage(frame);
    this.context.place = frame.place;
    this.fieldSounds.hearField(frame.field, time);
    frame.events.forEachSince(this.played, this.play);
    this.played = frame.events.latest;
    this.fieldSounds.playEach(this.playSwitched);
    this.kit.sounds.hold(
      THRUST,
      isSwitchedOn(THRUST, this.switches) && this.options.thrusting(),
    );
    this.kit.sounds.hold(
      LODESTONE_HUM,
      isSwitchedOn(LODESTONE_HUM, this.switches) &&
        this.options.lodestoneHums(),
    );
    this.holdBeds(frame.place);
    for (const painter of this.painters) painter.draw(this.context);
  }

  /**
   * Holds the bed of the place a wave is played in, and each layer over it
   * the multiplier has reached, by the view's rules, and fetches ahead the
   * bed of the place the next wave is played in and the layers, so each
   * joins as soon as it is wanted; none of them before the scene has drawn
   * its first frame and the sounds' sprite has loaded, so the beds' files
   * never hold up the first wave's picture or its sounds, nor while the
   * player's switches want no sound or no bed.
   */
  private holdBeds(place: PlaceId): void {
    const wanted =
      this.firstFrameDrawn &&
      this.kit.sounds.loaded &&
      this.switches.sound &&
      this.switches.bed;
    const multiplier = this.options.multiplier();
    for (const name of BED_NAMES) {
      this.kit.beds.hold(name, wanted && bedPlays(name, place, multiplier));
    }
    if (!wanted) return;
    for (const name of bedsAhead(this.options.placeAfter())) {
      this.kit.beds.fetch(name);
    }
  }

  /** Plays a sound of the frame's where the player's switches want it, for `playEach()`. */
  private readonly playSwitched: PlaySound = (name, detune, across, volume) => {
    if (!isSwitchedOn(name, this.switches)) return;
    this.kit.sounds.playAt(name, detune, across, volume);
  };

  /**
   * Plays what an event calls for, once, for `forEachSince()`, which takes
   * it each frame: tells the pod's pilot's face of it, and the faces of
   * those in tow, and the arcs a zap's arc to a rock, keeps its sound to
   * play with the frame's others, and plays its flourishes where motion is
   * welcome, and its points either way.
   */
  private readonly play = (event: Readonly<FieldEvent>): void => {
    this.kit.ship.hear(event, this.shownField.steps);
    this.kit.tow.hear(event, this.shownField.steps);
    this.kit.arcs.hear(event, this.context.now, this.shownField);
    this.fieldSounds.hear(event, this.shownField.torus.width);
    const flourishes = flourishesOf(effectsOf(event), this.context.motion);
    for (const flourish of flourishes) {
      this.flourishPlayer.play(flourish, event, this.context);
    }
  };

  /**
   * Writes the frame, where its ship is drawn, and how the scene now lays the
   * field out and paints it, into the context the frame's flourishes play
   * from and its painters draw from.
   */
  private stage({ field, alpha, seed, constellation }: FieldFrame): void {
    const context = this.context;
    context.field = field;
    context.alpha = alpha;
    context.shipDrawn = shipAt(field, alpha, this.drawnShip);
    context.seed = seed;
    context.constellation = constellation;
    context.deck = this.deckParts;
    context.metrics = this.metrics;
    context.palette = this.painted;
    context.font = this.options.font();
    context.zoom = this.zoom();
  }

  /**
   * Returns how much larger the field draws than its atlas was baked: its unit
   * over the baked unit.
   */
  private zoom(): number {
    return this.metrics.unit / (this.baked?.unit ?? this.metrics.unit);
  }

  /** Lays the field out again if it moved, and returns whether it did. */
  private fit(): boolean {
    if (!this.moved()) return false;
    this.measure();
    this.layOut();
    return true;
  }

  /**
   * Returns whether the canvas, its pixel ratio, the chrome over it, the
   * board's setting or the field's size changed.
   */
  private moved(): boolean {
    if (canvasChanged(this, this.viewport)) return true;
    // Each wave brings a torus of its own, of the same size or not.
    const { torus } = this.options.frame().field;
    return (
      this.chrome !== this.surroundings.insets() ||
      this.board !== this.options.board() ||
      this.torus.width !== torus.width ||
      this.torus.height !== torus.height
    );
  }

  /** Works out where the field and the deck lie on the canvas as it now is. */
  private measure(): void {
    this.chrome = this.surroundings.insets();
    this.board = this.options.board();
    this.torus = this.options.frame().field.torus;
    const viewport = viewportOf(this, this.chrome);
    this.viewport = viewport;
    this.metrics = fieldMetrics(viewport, this.board, this.torus);
    const deck = deckLayout(viewport, this.board, this.torus);
    this.deckParts = deck && deckOf(deck, this.board, viewport.pixelRatio);
    this.layout = { viewport, torus: this.torus, metrics: this.metrics, deck };
  }

  /**
   * Returns whether the field's atlas was baked at the scale the field is laid
   * out at: the same whole device pixels to a unit, at the same pixel ratio,
   * and the rocks with their fine marks only where the field keeps them.
   */
  private isBakedForLayout(): boolean {
    const scale = bakedScale(this.metrics);
    return (
      scale.unit === this.baked?.unit &&
      scale.pixelRatio === this.baked.pixelRatio &&
      isFine(this.metrics) === this.bakedFine
    );
  }

  /**
   * Points the field's camera at the field as measured, hands the steering
   * the layout, and tells the shell how the field and the deck lie.
   */
  private layOut(): void {
    this.kit.fieldCamera.fit(this.metrics);
    this.lightRocks();
    this.steering.measure(this.metrics, this.deckParts, this.board);
    this.options.onLayout(this.layout);
  }

  /**
   * Bakes the field's atlas and the rocks' at its scale, in the palette, and
   * the deck's on a new pixel ratio, and hands the shell what returns How to
   * play's pictures, the field's encoded from its atlas and the rocks' drawn
   * lit, on the first ask.
   */
  private bake(): void {
    const scale = bakedScale(this.metrics);
    const fine = isFine(this.metrics);
    const palette = this.painted;
    this.baked = scale;
    this.bakedFine = fine;
    bakeBeltAtlas(this, palette, scale, fine);
    if (this.deckBaked !== this.metrics.pixelRatio) {
      this.deckBaked = this.metrics.pixelRatio;
      bakeDeckAtlas(this, this.deckBaked);
    }
    const fieldPictures = picturesWhenAsked(this, ATLAS, PICTURE_FRAMES);
    let pictures: Pictures | null = null;
    this.options.onPictures(
      () =>
        (pictures ??= {
          ...fieldPictures(),
          rocks: rockPictures(palette, scale, fine),
        }),
    );
  }

  /** Lights the rocks with the palette's light, far off over the field. */
  private lightRocks(): void {
    const light = this.painted.rockLight;
    const { x, y, z, radius } = farLight(this.metrics, light);
    this.lights.ambientColor.set(light.ambient, light.ambient, light.ambient);
    this.sun.x = x;
    this.sun.y = y;
    this.sun.z = z;
    this.sun.radius = radius;
    this.sun.intensity = light.intensity;
  }

  /** Bakes the atlases again, and has every image take up its frame anew. */
  private rebake(): void {
    this.bake();
    this.lightRocks();
    retakeFrames(this, ATLAS);
    retakeFrames(this, DECK_ATLAS);
    retakeFrames(this, ROCK_ATLAS);
  }

  /**
   * Starts drawing a new field, from its first event, stopping what the
   * last one set off, and making the images it needs that the last didn't.
   */
  private startField(field: FieldView): void {
    this.shownField = field;
    this.played = 0;
    for (const painter of this.painters) painter.start?.(field);
    this.flourishPlayer.start();
  }

  /**
   * Turns the keys, the mouse and the fingers into steering, and keys into
   * commands, and lets go of every key and finger as the player looks away,
   * so none sticks.
   */
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
    onPlayerAway(this, () => {
      this.steering.letGo();
    });
  }

  /**
   * Holds a key that flies the ship, which goes on with a paused game too,
   * and passes on what any other key asks, once per press, leaving the
   * browser its shortcuts.
   */
  private press(event: KeyboardEvent): void {
    if (isShortcut(event)) return;
    if (this.steering.press(event.code)) {
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
