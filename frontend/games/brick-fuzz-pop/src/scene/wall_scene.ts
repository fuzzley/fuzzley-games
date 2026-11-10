import { isShortcut } from "@fz/core/keys";
import { recordOf } from "@fz/core/records";
import type { SceneSurroundings } from "@fz/phaser/host";
import { type Insets, NO_INSETS } from "@fz/phaser/insets";
import type { Viewport } from "@fz/phaser/layout";
import {
  canvasChanged,
  onFirstFrame,
  onKeyDown,
  picturesWhenAsked,
  retakeFrames,
  uniqueSceneKey,
  viewportOf,
} from "@fz/phaser/scene";
import type { ArtScale } from "@fz/phaser/shapes";
import { SpritePlayer } from "@fz/phaser/sound";
import { type GameObjects, Scene } from "phaser";
import type { WallPalette } from "../view/colors/palette";
import type { SoundName } from "../view/effects/effects";
import {
  type FieldMetrics,
  type FieldShape,
  fieldMetrics,
  hasRoom,
} from "../view/field/field_metrics";
import type { RoundView } from "../view/round_play";
import { type FieldCommand, commandOfKey } from "../view/steering/controls";
import { STRAIGHT_UP, type Steer } from "../view/steering/steering";
import { ATLAS, bakeWallAtlas, bakedScaleOf } from "./atlas";
import { LAYERS, type Layer } from "./layers";
import { FieldPainter } from "./painters/field_painter";
import type { PaintContext, Painter } from "./painters/painter";
import { WallPainter } from "./painters/wall_painter";
import { PICTURE_FRAMES, type Pictures } from "./pictures";
import spritemap from "./sounds/sounds.json";
import spriteUrl from "./sounds/sounds.wav?url";
import type { Guide } from "./stand_ins";

/**
 * The steering the scene hands the shell each frame, as it reads none from
 * the player's hands yet: the aim straight up, no charge, nothing let fly.
 */
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
   * Returns the round in play as the view draws it at this moment. Its
   * `wallDrop` is 1 while the wall stands still; the wall that comes down
   * is handed over at once, with `wallDrop` 0, which eases it down from
   * where it stood as it goes to 1.
   */
  readonly view: () => RoundView;
  /** Returns the guide to draw, or null where none shows. */
  readonly guide: () => Guide | null;
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
 * Draws a level of Brick Fuzz Pop: hands the shell each frame's time,
 * then pulls the round to draw and draws the field and the wall as it
 * stands, and turns keys into commands.
 */
export class WallScene extends Scene {
  /** The key the scene is registered under, which no other shares. */
  readonly key: string;

  /** Draws the field, its band, its lintel, its frame and its lines. */
  field!: FieldPainter;
  /** Draws the wall. */
  wall!: WallPainter;
  /** Plays the sounds. */
  sounds!: SpritePlayer<SoundName>;
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
  /** The scale the atlas was last baked at. */
  private baked!: ArtScale;
  /** The palette the atlas was last baked in. */
  private painted!: WallPalette;

  constructor(
    private readonly options: WallSceneOptions,
    private readonly surroundings: SceneSurroundings,
  ) {
    const key = uniqueSceneKey("wall-scene");
    super(key);
    this.key = key;
  }

  /** Measures, bakes the atlas, builds the field in its layers, back to front, and starts listening. */
  create(): void {
    this.painted = this.options.palette();
    this.measure();
    this.bake();
    const layers = this.layers();
    this.field = new FieldPainter(this, layers);
    this.wall = new WallPainter(this, layers.wall);
    this.painters = [this.field, this.wall];
    this.context = {
      view: this.options.view(),
      shape: this.laidOut,
      metrics: this.metrics,
      baked: this.baked,
      palette: this.painted,
      motion: this.options.motion(),
    };
    this.sounds = new SpritePlayer(this, {
      key: "wall-sounds",
      spritemap,
      url: spriteUrl,
    });
    this.options.onLayout(this.metrics);
    this.listen();
    onFirstFrame(this, () => {
      this.surroundings.ready();
    });
  }

  /**
   * Hands the shell the time the frame took, then draws the round as the
   * view now has it.
   *
   * It allocates nothing of its own but on a new layout or a new palette.
   */
  override update(_time: number, delta: number): void {
    let stale = this.fit();
    this.options.tick(delta, UNSTEERED);
    this.sounds.follow(this.options.sound());
    const palette = this.options.palette();
    // The tick may have reshaped the field, between rounds.
    stale = this.fit() || stale;
    if (palette !== this.painted) {
      this.painted = palette;
      stale = true;
    }
    if (stale) this.rebake();
    this.draw();
  }

  /** Has each painter draw the field as it stands, in its layer. */
  private draw(): void {
    const context = this.context;
    context.view = this.options.view();
    context.shape = this.laidOut;
    context.metrics = this.metrics;
    context.baked = this.baked;
    context.palette = this.painted;
    context.motion = this.options.motion();
    for (const painter of this.painters) painter.draw(context);
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

  /** Turns the keys into commands, once per press, leaving the browser its shortcuts. */
  private listen(): void {
    onKeyDown(this, (event) => {
      if (isShortcut(event) || event.repeat) return;
      const command = commandOfKey(event.code);
      if (command) this.options.command(command);
    });
  }
}

/** Returns what builds a Brick Fuzz Pop scene, for the canvas to show. */
export function makeWallScene(
  options: WallSceneOptions,
): (surroundings: SceneSurroundings) => WallScene {
  return (surroundings) => new WallScene(options, surroundings);
}
