import { type PixelRect, framePixels } from "@fz/phaser/layout";
import { onContextRestored } from "@fz/phaser/scene";
import { type ArtScale, dashes, widthOf } from "@fz/phaser/shapes";
import type { GameObjects, Scene, Textures } from "phaser";
import { COLUMNS, MOST_DEPTH } from "../../rules/tuning";
import { DANGER_ROW, inDanger, neededBelow } from "../../rules/wall/lower";
import { type Thirds, type Wall, thirdsOf } from "../../rules/wall/wall";
import type { WallPalette } from "../../view/colors/palette";
import {
  FRAME_CSS_PX,
  type FieldMetrics,
  type FieldShape,
  bandPixels,
  lintelPixels,
} from "../../view/field/field_metrics";
import { ATLAS } from "../atlas";
import { COUNT_DOT, FIELD_FRAMES } from "../field_art";
import { placeDot } from "./dots";
import { dynamicTexture } from "./dynamic_texture";
import type { PaintContext, Painter } from "./painter";

/** The key of the texture the cells, the floor's band and the grid's dots are drawn on, once a layout. */
export const FIELD_BAKE = "field-bake";

/** Says how a dashed line is drawn, in field units: its dashes, the gaps between them, and its width. */
interface DashedLine {
  readonly dash: number;
  readonly gap: number;
  readonly width: number;
}

/** The jump line, as the art draws it: dashes of 14, gaps of 8 and a line of 2.4, of a cell of 40. */
export const JUMP_LINE: DashedLine = { dash: 0.35, gap: 0.2, width: 0.06 };

/** The danger line, as the art draws it: dashes of 8, gaps of 6 and a line of 2, of a cell of 40. */
export const DANGER_LINE: DashedLine = { dash: 0.2, gap: 0.15, width: 0.05 };

/** The most bricks left under the jump line whose count shows at its end. */
export const MOST_COUNTED = 9;

/** How far apart the dots of the jump line's count are, in field units. */
const COUNT_PITCH = 0.24;

/** How many of the count's dots stand together, so as many as nine read at a glance, as threes. */
const COUNT_GROUP = 3;

/** How much further apart two groups of the count's dots stand than two dots of one, in field units. */
const GROUP_GAP = 0.12;

/** Says where a dash of a line across the field runs, in whole device pixels across the canvas. */
interface Span {
  readonly from: number;
  readonly to: number;
}

/** Names the layers the field is drawn in: under the wall, over it, over the guide, and over everything. */
export interface FieldLayers {
  readonly field: GameObjects.Layer;
  readonly lines: GameObjects.Layer;
  readonly count: GameObjects.Layer;
  readonly rim: GameObjects.Layer;
}

/**
 * Returns where the field laid out in a shape lies from the lintel's top to
 * the band's bottom with the frame around it, in device pixels: the frame's
 * outer edge, inside which the painters draw all of the field.
 */
export function frameBounds(
  metrics: FieldMetrics,
  shape: FieldShape,
): PixelRect {
  const { x, y, width, height, unit } = metrics;
  const frame = framePixels(FRAME_CSS_PX, metrics.pixelRatio);
  const top = y - lintelPixels(shape, unit) - frame;
  const bottom = y + height + bandPixels(shape, unit) + frame;
  return {
    x: x - frame,
    y: top,
    width: width + 2 * frame,
    height: bottom - top,
  };
}

/**
 * Draws the field: under the wall, its cells, the floor's band and a dot at
 * each corner its cells share, drawn on a texture, the bake, which one
 * image shows; over the wall, the jump line, with a dot for each brick the
 * level needs left under it once nine or fewer are, in threes, over the
 * guide, and the danger line, which brightens, solid and twice as thick,
 * while such a brick stands at or under the row over it; and over
 * everything, the lintel over the ceiling and the frame around them all,
 * so nothing that bursts from the wall or flies covers them. It draws them
 * again only once the layout, the scale, the palette, that count or the
 * danger changes, and the bake once a lost context is restored.
 */
export class FieldPainter implements Painter {
  /** Shows the bake: the cells, the floor's band under them and a dot at each corner the cells share, its top left at the cells'. */
  readonly ground: GameObjects.Image;
  /** Draws the lintel, the ceiling and the frame, over everything else. */
  readonly rim: GameObjects.Graphics;
  /** Draws the jump line and the danger line. */
  readonly lines: GameObjects.Graphics;
  /** The jump line's count, a dot for each brick left under it, made once, from its end. */
  readonly countDots: readonly GameObjects.Image[];

  /** The texture the cells, the band and the dots are drawn on. */
  private readonly bake: Textures.DynamicTexture;
  /** Whether the bake must be drawn again though nothing was laid out anew: once a lost context is restored. */
  private lost = false;
  private metrics: FieldMetrics | null = null;
  private palette: WallPalette | null = null;
  private shape: FieldShape | null = null;
  private baked: ArtScale | null = null;
  /** The thirds of the field as laid out, worked out once a layout: the jump line runs under the top one. */
  private thirds: Thirds = thirdsOf(MOST_DEPTH);
  /** The jump line's dashes across the whole field, worked out once a layout, so a count shortens the line without moving them. */
  private jumpDashes: readonly Span[] = [];
  /** The danger line's dashes, worked out once a layout. */
  private dangerDashes: readonly Span[] = [];
  private wall: Wall | null = null;
  /** How many bricks the jump line's count shows, 0 where it shows none. */
  private counted = 0;
  /** How far, in device pixels, another dot's edge keeps from a count's dot's: as far as the count's groups stand apart, worked out once a layout. */
  private clearance = 0;
  /** Whether a brick the level needs stands at or under the row over the floor's, which brightens the danger line. */
  private danger = false;

  constructor(scene: Scene, layers: FieldLayers) {
    this.bake = dynamicTexture(scene, FIELD_BAKE);
    this.ground = scene.add.image(0, 0, FIELD_BAKE).setOrigin(0, 0);
    this.lines = scene.add.graphics();
    this.rim = scene.add.graphics();
    this.countDots = Array.from({ length: MOST_COUNTED }, () =>
      scene.add.image(0, 0, ATLAS, FIELD_FRAMES.countDot).setVisible(false),
    );
    layers.field.add(this.ground);
    layers.lines.add(this.lines);
    layers.count.add([...this.countDots]);
    layers.rim.add(this.rim);
    // The bake goes with a lost context; the atlas is baked anew.
    onContextRestored(scene, () => {
      this.lost = true;
    });
  }

  /**
   * Returns whether a dot some device pixels wide about a place on the
   * canvas would stand nearer a dot of the jump line's count than the
   * count's groups stand to each other, where it could be read as one of
   * the count's.
   */
  crowdsCount(x: number, y: number, side: number): boolean {
    for (const dot of this.countDots) {
      const reach = (side + dot.displayWidth) / 2 + this.clearance;
      if (dot.visible && Math.hypot(dot.x - x, dot.y - y) < reach) return true;
    }
    return false;
  }

  /** Draws the field as the frame has it, again only where its layout, its scale, its palette, the jump line's count or the danger changed, and bakes it again once a lost context is restored. */
  draw({ view, shape, metrics, baked, palette }: Readonly<PaintContext>): void {
    const laidOut =
      metrics !== this.metrics ||
      palette !== this.palette ||
      shape !== this.shape ||
      baked !== this.baked;
    if (laidOut) {
      this.metrics = metrics;
      this.palette = palette;
      this.shape = shape;
      this.baked = baked;
      this.thirds = thirdsOf(shape.depth);
      this.jumpDashes = spansAcross(metrics, JUMP_LINE);
      this.dangerDashes = spansAcross(metrics, DANGER_LINE);
      this.clearance = (COUNT_PITCH + GROUP_GAP - COUNT_DOT) * metrics.unit;
      this.drawRim(metrics, shape, palette);
    }
    if (laidOut || this.lost) this.bakeGround(metrics, shape, palette, baked);
    if (!laidOut && view.wall === this.wall) return;
    this.wall = view.wall;
    const left = neededBelow(view.wall, this.thirds.jumpLine);
    const counted = left <= MOST_COUNTED ? left : 0;
    const danger = inDanger(view.wall);
    if (!laidOut && counted === this.counted && danger === this.danger) {
      return;
    }
    this.counted = counted;
    this.danger = danger;
    this.drawLines(metrics, shape, palette, baked);
  }

  /**
   * Draws the cells, the floor's band under them and a dot at each corner
   * the cells share, on whole pixels as `placeDot()` puts a dot, on the
   * bake, as large as the cells and the band, and shows it at the cells'
   * top left.
   */
  private bakeGround(
    { x, y, width, height, unit }: FieldMetrics,
    shape: FieldShape,
    palette: WallPalette,
    baked: ArtScale,
  ): void {
    const band = bandPixels(shape, unit);
    const bake = this.bake.setSize(width, height + band, false);
    // The image takes up its frame again, so it keeps no size the bake had.
    this.ground.setFrame(this.ground.frame.name).setPosition(x, y);
    bake.clear();
    bake.fill(palette.field, 1, 0, 0, width, height);
    bake.fill(palette.band, 1, 0, height, width, band);
    const dot = bake.manager.getFrame(ATLAS, FIELD_FRAMES.gridDot);
    const side = Math.round(dot.width * (unit / baked.unit));
    // From the dot's top left, its scale its own for the layout.
    const stamp = { scale: side / dot.width, originX: 0, originY: 0 };
    for (let row = 1; row < shape.depth; row++) {
      for (let column = 1; column < COLUMNS; column++) {
        bake.stamp(
          ATLAS,
          FIELD_FRAMES.gridDot,
          Math.round(column * unit - side / 2),
          Math.round(row * unit - side / 2),
          stamp,
        );
      }
    }
    bake.render();
    this.lost = false;
  }

  /** Draws the lintel over the cells, the ceiling, and the frame around them all, outside them. */
  private drawRim(
    metrics: FieldMetrics,
    shape: FieldShape,
    palette: WallPalette,
  ): void {
    const { x, y, width, unit } = metrics;
    const lintel = lintelPixels(shape, unit);
    const frame = framePixels(FRAME_CSS_PX, metrics.pixelRatio);
    const outer = frameBounds(metrics, shape);
    const side = outer.height - 2 * frame;
    const graphics = this.rim.clear();
    graphics.fillStyle(palette.band);
    graphics.fillRect(x, y - lintel, width, lintel);
    graphics.fillStyle(palette.line);
    // The ceiling, along the lintel's foot, clear of the wall's top row.
    graphics.fillRect(x, y - frame, width, frame);
    graphics.fillRect(outer.x, outer.y, outer.width, frame);
    graphics.fillRect(
      outer.x,
      outer.y + outer.height - frame,
      outer.width,
      frame,
    );
    graphics.fillRect(outer.x, outer.y + frame, frame, side);
    graphics.fillRect(
      outer.x + outer.width - frame,
      outer.y + frame,
      frame,
      side,
    );
  }

  /**
   * Draws the jump line under the top third, and its count at its end, a
   * dot for each brick left under it, from the end, where there is one;
   * and the danger line along the top of the floor's row, dashed, or solid
   * and twice as thick while a brick the level needs stands at or under the
   * row over it.
   */
  private drawLines(
    metrics: FieldMetrics,
    shape: FieldShape,
    palette: WallPalette,
    baked: ArtScale,
  ): void {
    const { x, y, width, unit } = metrics;
    const jumpY = y + this.thirds.jump * unit;
    const counted = this.counted;
    const scale = unit / baked.unit;
    const graphics = this.lines.clear();
    graphics.fillStyle(palette.jumpLine);
    // The dashes stop half a dot's pitch short of the count's last dot.
    this.dashed(
      this.jumpDashes,
      jumpY,
      counted > 0
        ? countDotX(metrics, counted - 1) - (COUNT_PITCH * unit) / 2
        : x + width,
      widthOf(JUMP_LINE.width, metrics),
    );
    this.countDots.forEach((dot, at) => {
      placeDot(dot, countDotX(metrics, at), jumpY, scale).setVisible(
        at < counted,
      );
    });
    graphics.fillStyle(palette.dangerLine);
    const dangerY = y + (shape.depth - DANGER_ROW) * unit;
    const thick = widthOf(DANGER_LINE.width, metrics);
    if (this.danger) {
      graphics.fillRect(x, dangerY - thick, width, 2 * thick);
    } else {
      this.dashed(this.dangerDashes, dangerY, x + width, thick);
    }
  }

  /**
   * Draws a dashed line's dashes at a height on the canvas, some device
   * pixels thick, those that end short of a point across it, in the fill
   * the lines hold.
   */
  private dashed(
    spans: readonly Span[],
    lineY: number,
    reach: number,
    thick: number,
  ): void {
    const top = lineY - Math.floor(thick / 2);
    for (const { from, to } of spans) {
      if (to <= reach) this.lines.fillRect(from, top, to - from, thick);
    }
  }
}

/** Returns the dashes of a line across the whole field, in whole device pixels, a gap at least short of either side. */
function spansAcross(
  { x, width, unit }: FieldMetrics,
  line: DashedLine,
): readonly Span[] {
  return dashes(
    { x, y: 0 },
    { x: x + width, y: 0 },
    line.dash * unit,
    line.gap * unit,
  ).map((dash) => ({
    from: Math.round(dash.from.x),
    to: Math.round(dash.to.x),
  }));
}

/**
 * Returns where across the canvas the middle of a dot of the jump line's
 * count stands, counted from its end: the first a gap short of the right
 * wall, and a wider gap after each group.
 */
function countDotX({ x, width, unit }: FieldMetrics, at: number): number {
  return (
    x +
    width -
    (JUMP_LINE.gap +
      (at + 0.5) * COUNT_PITCH +
      Math.floor(at / COUNT_GROUP) * GROUP_GAP) *
      unit
  );
}
