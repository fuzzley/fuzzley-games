import { paintTexture } from "@fz/phaser/scene";
import type { GameObjects, Scene } from "phaser";
import type { BeltPalette } from "../../view/colors/palette";
import type { FieldMetrics } from "../../view/field/field_metrics";
import type { FieldView } from "../../view/field/frame";
import { placeColors } from "../../view/places/colors";
import { Travel, flickerAt, nearSlide } from "../../view/places/motion";
import {
  type Flash,
  MOST_FLASHES,
  type PlaceArt,
  type PlaceFrame,
  placeArt,
} from "../../view/places/paint";
import { type BackdropOptions, backdropOf } from "../../view/places/places";
import type { PaintContext, Painter } from "./painter";

/** The textures a place is painted into: what stays, the nearer stars, what stands before them, and what stands before its flashes. */
export const PLACE_TEXTURES = {
  back: "belt-place-back",
  near: "belt-place-near",
  front: "belt-place-front",
  over: "belt-place-over",
} as const;

/** Returns the texture a place's flash is painted into, by its place among the art's flashes. */
export function flashTexture(index: number): string {
  return `belt-place-flash-${String(index)}`;
}

/** Says what a place was painted for: where it is laid out, at what scale, in what palette. */
type PaintedFor = BackdropOptions &
  PlaceFrame & { readonly palette: BeltPalette };

/** Holds a flash's image and what it shows. */
interface Shown {
  readonly image: GameObjects.Image;
  flash: Flash | null;
}

/** How many copies of the nearer stars are laid along each axis, side by side. */
const NEAR_COPIES = 3;

/**
 * Paints the place the wave is played in behind the field, in three
 * pictures: what stays, the nearer stars, which slide against the pod's
 * travel by a small share of it, and what stands before them; and, where
 * the place flashes, each flicker of its landmark's over them, as strongly
 * as it is at the field's step, under a fourth picture, of what stands
 * before the flickers.
 *
 * Every picture but the nearer stars reaches the art's bleed past each edge
 * of the field, as far as its camera kicks and shakes. The nearer stars, a
 * picture the field's size, are laid in nine copies, three across and three
 * down, as far as the stars slid, so they cover the field and its bleed,
 * wrapped.
 *
 * It paints a place once, and again only for another place, palette, field
 * size, unit, pixel ratio, run or constellation. Where motion isn't welcome,
 * the stars stop where they lie and nothing flickers.
 */
export class PlacePainter implements Painter {
  /** The field's color, the wash and the far stars. */
  readonly back: GameObjects.Image;
  /** The nearer stars' copies, row by row, each a field's width and height from the next. */
  readonly near: readonly GameObjects.Image[];
  /** The landmark, the air and the vignette, or, where the place flashes, the landmark behind its flashes. */
  readonly front: GameObjects.Image;
  /** What stands before the flashes, shown only where the place flashes. */
  readonly over: GameObjects.Image;

  /** An image for as many flashes as a place has at most, made once. */
  private readonly flashes: readonly Shown[];
  private readonly travel = new Travel();
  private paintedFor: PaintedFor | null = null;
  private laidOut: FieldMetrics | null = null;
  private shownArt: PlaceArt | null = null;
  /** How far past each edge of the field the back, the front and what stands before the flashes reach, as last painted. */
  private bleed = 0;

  constructor(
    private readonly scene: Scene,
    layer: GameObjects.Layer,
  ) {
    // Phaser's empty texture, which draws nothing, until the first frame
    // paints the place.
    this.back = scene.add.image(0, 0, "__DEFAULT").setOrigin(0);
    this.near = Array.from({ length: NEAR_COPIES ** 2 }, () =>
      scene.add.image(0, 0, "__DEFAULT").setOrigin(0),
    );
    this.front = scene.add.image(0, 0, "__DEFAULT").setOrigin(0);
    this.flashes = Array.from({ length: MOST_FLASHES }, () => ({
      image: scene.add.image(0, 0, "__DEFAULT").setOrigin(0).setVisible(false),
      flash: null,
    }));
    this.over = scene.add
      .image(0, 0, "__DEFAULT")
      .setOrigin(0)
      .setVisible(false);
    layer.add([
      this.back,
      ...this.near,
      this.front,
      ...this.flashes.map(({ image }) => image),
      this.over,
    ]);
  }

  /** The place as last painted, or null before the first frame. */
  get art(): PlaceArt | null {
    return this.shownArt;
  }

  /** Starts on a new field from no travel, so its stars start where they lie. */
  start(): void {
    this.travel.reset();
  }

  /**
   * Paints the place the frame is in where it changed, lays it where the
   * metrics put the field, slides its nearer stars and shows its flashes.
   */
  draw(context: Readonly<PaintContext>): void {
    const { field, metrics, motion } = context;
    const stale = !paints(this.paintedFor, context);
    if (stale) this.paint(paintedForFrame(context));
    if (stale || metrics !== this.laidOut) this.layOut(metrics);
    if (motion) this.travel.follow(context.shipDrawn, field.torus);
    else this.travel.lose();
    this.slide(metrics);
    this.flicker(field, motion);
  }

  /**
   * Paints a place into its textures, each the size it is painted at: the
   * nearer stars the field's, a flash its area's, and the rest the field's
   * and its bleed past each edge.
   */
  private paint(paintedFor: PaintedFor): void {
    this.paintedFor = paintedFor;
    const { width, height } = paintedFor;
    const backdrop = backdropOf(paintedFor);
    const art = placeArt(backdrop, placeColors(paintedFor.palette), paintedFor);
    this.shownArt = art;
    this.bleed = art.bleed;
    const { scene } = this;
    const across = width + 2 * art.bleed;
    const down = height + 2 * art.bleed;
    paintTexture(scene, PLACE_TEXTURES.back, across, down, art.back);
    paintTexture(scene, PLACE_TEXTURES.near, width, height, art.near);
    paintTexture(scene, PLACE_TEXTURES.front, across, down, art.front);
    // Each takes its texture again, which takes its new size.
    this.back.setTexture(PLACE_TEXTURES.back);
    for (const copy of this.near) copy.setTexture(PLACE_TEXTURES.near);
    this.front.setTexture(PLACE_TEXTURES.front);
    const flashing = art.over.length > 0;
    if (flashing) {
      paintTexture(scene, PLACE_TEXTURES.over, across, down, art.over);
      this.over.setTexture(PLACE_TEXTURES.over);
    }
    this.over.setVisible(flashing);
    for (const [i, shown] of this.flashes.entries()) {
      const flash = art.flashes[i] ?? null;
      shown.flash = flash;
      if (flash) {
        const key = flashTexture(i);
        const { area } = flash;
        paintTexture(scene, key, area.width, area.height, flash.commands);
        shown.image.setTexture(key);
      } else {
        shown.image.setVisible(false);
      }
    }
  }

  /** Lays the place's pictures and its flashes where the metrics put the field, the bleed past its edges. */
  private layOut(metrics: FieldMetrics): void {
    this.laidOut = metrics;
    const { x, y } = metrics;
    const { bleed } = this;
    this.back.setPosition(x - bleed, y - bleed);
    this.front.setPosition(x - bleed, y - bleed);
    this.over.setPosition(x - bleed, y - bleed);
    for (const { image, flash } of this.flashes) {
      if (flash) image.setPosition(x + flash.area.x, y + flash.area.y);
    }
  }

  /**
   * Lays the nearer stars' copies as far as they slid against the pod's
   * travel, the middle one wrapped to lie no further than the bleed left of
   * and above the field, so the three each way cover it and its bleed.
   */
  private slide({ x, y, unit, width, height }: FieldMetrics): void {
    const { bleed } = this;
    const across =
      ((nearSlide(this.travel.x, unit, width) + bleed) % width) - bleed;
    const down =
      ((nearSlide(this.travel.y, unit, height) + bleed) % height) - bleed;
    for (let i = 0; i < this.near.length; i++) {
      const column = (i % NEAR_COPIES) - 1;
      const row = Math.floor(i / NEAR_COPIES) - 1;
      this.near[i]?.setPosition(
        x + across + column * width,
        y + down + row * height,
      );
    }
  }

  /** Shows each flash as strongly as its flicker is at the field's step, where motion is welcome. */
  private flicker(field: FieldView, motion: boolean): void {
    for (const { image, flash } of this.flashes) {
      if (!flash) continue;
      const shown = motion ? flickerAt(flash.flicker, field.steps) : 0;
      image.setVisible(shown > 0).setAlpha(shown);
    }
  }
}

/** Returns what a frame's place is painted for. */
function paintedForFrame(context: Readonly<PaintContext>): PaintedFor {
  const { place, palette, metrics, field, seed, constellation } = context;
  return {
    place,
    palette,
    unit: metrics.unit,
    pixelRatio: metrics.pixelRatio,
    width: metrics.width,
    height: metrics.height,
    torus: field.torus,
    seed,
    constellation,
  };
}

/** Returns whether a place painted for one frame paints the picture another's would, so that one needs none of its own. */
function paints(
  last: PaintedFor | null,
  {
    place,
    palette,
    metrics,
    field,
    seed,
    constellation,
  }: Readonly<PaintContext>,
): boolean {
  return (
    last !== null &&
    last.place === place &&
    last.palette === palette &&
    last.unit === metrics.unit &&
    last.pixelRatio === metrics.pixelRatio &&
    last.width === metrics.width &&
    last.height === metrics.height &&
    last.torus.width === field.torus.width &&
    last.torus.height === field.torus.height &&
    last.seed === seed &&
    last.constellation?.x === constellation?.x &&
    last.constellation?.y === constellation?.y
  );
}
