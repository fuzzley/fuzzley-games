import { framePixels } from "@fz/phaser/layout";
import { type ArtScale, dashes, widthOf } from "@fz/phaser/shapes";
import type { GameObjects, Scene } from "phaser";
import { fieldRowOf } from "../../rules/grid";
import { COLUMNS, MOST_DEPTH } from "../../rules/tuning";
import { isNeeded } from "../../rules/wall/lower";
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
import { FIELD_FRAMES } from "../field_art";
import type { PaintContext, Painter } from "./painter";

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

/** How high the danger line runs, in field units: along the top of the floor's row. */
const DANGER_HEIGHT = 1;

/** Says where a dash of a line across the field runs, in whole device pixels across the canvas. */
interface Span {
  readonly from: number;
  readonly to: number;
}

/** Names the layers the field is drawn in: under the wall, and over it. */
export interface FieldLayers {
  readonly field: GameObjects.Layer;
  readonly lines: GameObjects.Layer;
}

/**
 * Draws the field: under the wall, its cells, the floor's band, the lintel
 * over the ceiling, the frame around them and a dot at each corner its
 * cells share; over the wall, the jump line, with a dot for each brick the
 * level needs left under it once nine or fewer are, in threes, and the
 * danger line. It draws them again only once the layout, the palette or
 * that count changes.
 */
export class FieldPainter implements Painter {
  /** Draws the cells, the band, the lintel, the ceiling and the frame. */
  readonly ground: GameObjects.Graphics;
  /** A dot for each corner the cells of the deepest field share, made once, row by row from the ceiling. */
  readonly gridDots: readonly GameObjects.Image[];
  /** Draws the jump line and the danger line. */
  readonly lines: GameObjects.Graphics;
  /** The jump line's count, a dot for each brick left under it, made once, from its end. */
  readonly countDots: readonly GameObjects.Image[];

  private metrics: FieldMetrics | null = null;
  private palette: WallPalette | null = null;
  private shape: FieldShape | null = null;
  /** The thirds of the field as laid out, worked out once a layout: the jump line runs under the top one. */
  private thirds: Thirds = thirdsOf(MOST_DEPTH);
  /** The jump line's dashes across the whole field, worked out once a layout, so a count shortens the line without moving them. */
  private jumpDashes: readonly Span[] = [];
  /** The danger line's dashes, worked out once a layout. */
  private dangerDashes: readonly Span[] = [];
  private wall: Wall | null = null;
  /** How many bricks the jump line's count shows, 0 where it shows none. */
  private counted = 0;

  constructor(scene: Scene, layers: FieldLayers) {
    this.ground = scene.add.graphics();
    this.gridDots = Array.from(
      { length: (COLUMNS - 1) * (MOST_DEPTH - 1) },
      () =>
        scene.add.image(0, 0, ATLAS, FIELD_FRAMES.gridDot).setVisible(false),
    );
    this.lines = scene.add.graphics();
    this.countDots = Array.from({ length: MOST_COUNTED }, () =>
      scene.add.image(0, 0, ATLAS, FIELD_FRAMES.countDot).setVisible(false),
    );
    layers.field.add([this.ground, ...this.gridDots]);
    layers.lines.add([this.lines, ...this.countDots]);
  }

  /** Draws the field as the frame has it, again only where its layout, its palette or the jump line's count changed. */
  draw({ view, shape, metrics, baked, palette }: Readonly<PaintContext>): void {
    const laidOut =
      metrics !== this.metrics ||
      palette !== this.palette ||
      shape !== this.shape;
    if (laidOut) {
      this.metrics = metrics;
      this.palette = palette;
      this.shape = shape;
      this.thirds = thirdsOf(shape.depth);
      this.jumpDashes = spansAcross(metrics, JUMP_LINE);
      this.dangerDashes = spansAcross(metrics, DANGER_LINE);
      this.drawGround(metrics, shape, palette);
      this.placeGridDots(metrics, shape, metrics.unit / baked.unit);
    }
    if (!laidOut && view.wall === this.wall) return;
    this.wall = view.wall;
    const left = neededUnder(view.wall, this.thirds.jumpLine);
    const counted = left <= MOST_COUNTED ? left : 0;
    if (!laidOut && counted === this.counted) return;
    this.counted = counted;
    this.drawLines(metrics, shape, palette, baked);
  }

  /** Draws the cells, the floor's band under them, the lintel over them, the ceiling, and the frame around them all, outside them. */
  private drawGround(
    metrics: FieldMetrics,
    shape: FieldShape,
    palette: WallPalette,
  ): void {
    const { x, y, width, height, unit } = metrics;
    const lintel = lintelPixels(shape, unit);
    const band = bandPixels(shape, unit);
    const frame = framePixels(FRAME_CSS_PX, metrics.pixelRatio);
    const top = y - lintel;
    const bottom = y + height + band;
    const graphics = this.ground.clear();
    graphics.fillStyle(palette.field);
    graphics.fillRect(x, y, width, height);
    graphics.fillStyle(palette.band);
    graphics.fillRect(x, y + height, width, band);
    graphics.fillRect(x, top, width, lintel);
    graphics.fillStyle(palette.line);
    // The ceiling, along the lintel's foot, clear of the wall's top row.
    graphics.fillRect(x, y - frame, width, frame);
    graphics.fillRect(x - frame, top - frame, width + 2 * frame, frame);
    graphics.fillRect(x - frame, bottom, width + 2 * frame, frame);
    graphics.fillRect(x - frame, top, frame, bottom - top);
    graphics.fillRect(x + width, top, frame, bottom - top);
  }

  /** Puts a dot at each corner the field's cells share, hiding those a shallower field hasn't. */
  private placeGridDots(
    { x, y, unit }: FieldMetrics,
    { depth }: FieldShape,
    scale: number,
  ): void {
    this.gridDots.forEach((dot, at) => {
      const row = Math.floor(at / (COLUMNS - 1)) + 1;
      const column = (at % (COLUMNS - 1)) + 1;
      placeDot(dot, x + column * unit, y + row * unit, scale).setVisible(
        row < depth,
      );
    });
  }

  /**
   * Draws the jump line under the top third, and its count at its end, a
   * dot for each brick left under it, from the end, where there is one;
   * and the danger line along the top of the floor's row.
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
    this.dashed(
      this.dangerDashes,
      y + (shape.depth - DANGER_HEIGHT) * unit,
      x + width,
      widthOf(DANGER_LINE.width, metrics),
    );
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
 * Shows a dot about a point, scaled, a whole number of device pixels wide
 * and high, its edges on whole pixels, which a dot baked whole needs to
 * stay sharp where the game doesn't round its images' places.
 */
function placeDot(
  dot: GameObjects.Image,
  x: number,
  y: number,
  scale: number,
): GameObjects.Image {
  const side = Math.round(dot.width * scale);
  return dot
    .setDisplaySize(side, side)
    .setPosition(onWholePixels(x, side), onWholePixels(y, side));
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

/** Returns where the middle of something some whole device pixels wide stands about a point, so that its edges fall on whole pixels. */
function onWholePixels(middle: number, side: number): number {
  return Math.round(middle - side / 2) + side / 2;
}

/** Returns how many bricks the level needs stand in the field's rows under a line, at a row's foot, which a jump waits on. */
function neededUnder(wall: Wall, line: number): number {
  let count = 0;
  for (let cell = 0; cell < wall.bricks.length; cell++) {
    const brick = wall.bricks[cell];
    if (brick && fieldRowOf(wall, cell) < line && isNeeded(brick)) count++;
  }
  return count;
}
