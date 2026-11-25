// The field a wall game's wall stands in: its cells, the floor's band and
// the grid's dots under the wall, the jump line, its count and the danger
// line over it, and the lintel, the ceiling and the frame over everything.
// The cells, the band, the dots and the two lines are drawn on textures,
// so a frame draws an image of them rather than their shapes again.

import { type PixelRect, framePixels } from "@fz/phaser/layout";
import {
  dynamicTexture,
  onContextRestored,
  whenSceneEnds,
} from "@fz/phaser/scene";
import { type ArtScale, dashes, widthOf } from "@fz/phaser/shapes";
import type { GameObjects, Scene, Textures } from "phaser";
import { COLUMNS, MOST_DEPTH } from "../rules/field";
import {
  DANGER_ROW,
  type Thirds,
  type Wall,
  type WallRules,
  inDanger,
  neededBelow,
  thirdsOf,
} from "../rules/wall";
import {
  FRAME_CSS_PX,
  type FieldMetrics,
  type FieldShape,
  bandPixels,
  frameBounds,
  lintelPixels,
} from "../view/field_metrics";
import type { WallPalette } from "../view/palette";
import { ATLAS } from "./atlas";
import {
  type PaintContext,
  type Painter,
  type WallView,
  placeDot,
} from "./painter";

/** The key of the texture the cells, the floor's band and the grid's dots are drawn on, once a layout. */
export const FIELD_BAKE = "field-bake";

/** The keys of the textures the jump line and the danger line are drawn on, each a strip across the field, again only as the lines change. */
export const LINE_BAKES = {
  jump: "jump-line-bake",
  danger: "danger-line-bake",
} as const;

/** Says how a dashed line is drawn, in field units: its dashes, the gaps between them, and its width. */
export interface DashedLine {
  readonly dash: number;
  readonly gap: number;
  readonly width: number;
}

/** The jump line: dashes of 14, gaps of 8 and a line of 2.4, of a cell of 40. */
export const JUMP_LINE: DashedLine = { dash: 0.35, gap: 0.2, width: 0.06 };

/** The danger line: dashes of 8, gaps of 6 and a line of 2, of a cell of 40. */
export const DANGER_LINE: DashedLine = { dash: 0.2, gap: 0.15, width: 0.05 };

/** The most bricks left under the jump line whose count shows at its end. */
export const MOST_COUNTED = 9;

/** How far apart the dots of the jump line's count are, in field units. */
export const COUNT_PITCH = 0.24;

/** How many of the count's dots stand together, so as many as nine read at a glance, as threes. */
export const COUNT_GROUP = 3;

/** How much further apart two groups of the count's dots stand than two dots of one, in field units. */
export const GROUP_GAP = 0.12;

/** Says where a dash of a line across the field runs, in whole device pixels across the canvas. */
interface Span {
  readonly from: number;
  readonly to: number;
}

/** Names a line across the field: the jump line or the danger line. */
type LineName = keyof typeof LINE_BAKES;

/** Describes a strip a line across the field is drawn on: the texture, and the image that shows it. */
interface LineStrip {
  readonly bake: Textures.DynamicTexture;
  readonly image: GameObjects.Image;
}

/** Describes where a line across the field runs on the canvas: its height and how thick it is drawn, in device pixels. */
interface LineAt {
  readonly y: number;
  readonly thick: number;
}

/** Where the lines run before a layout: nowhere. */
const NO_LINES: Readonly<Record<LineName, LineAt>> = {
  jump: { y: 0, thick: 0 },
  danger: { y: 0, thick: 0 },
};

/** Names the layers the field is drawn in: under the wall, over it, over the guide, and over everything. */
export interface FieldLayers {
  readonly field: GameObjects.Layer;
  readonly lines: GameObjects.Layer;
  readonly count: GameObjects.Layer;
  readonly rim: GameObjects.Layer;
}

/** Says which of a game's frames the field shows, and how wide the count's dot is drawn. */
export interface FieldArt {
  /** The frame of the dot at each corner the cells share. */
  readonly gridDot: string;
  /** The frame of a dot of the jump line's count. */
  readonly countDot: string;
  /**
   * How wide the count's dot is drawn, in field units, which another dot
   * keeps as far from as the count's groups stand apart.
   */
  readonly countDotWidth: number;
}

/**
 * Returns where the floor's band lies on the canvas under the cells of a
 * field laid out in a shape, in device pixels: the place in it a game draws
 * its own things into, such as what a player has earned, over the band the
 * field paints and under its frame.
 */
export function bandBounds(
  metrics: FieldMetrics,
  shape: FieldShape,
): PixelRect {
  const { x, y, width, height, unit } = metrics;
  return { x, y: y + height, width, height: bandPixels(shape, unit) };
}

/** Makes the strip a line is drawn on, under a texture's key: the texture, and the image that shows it from its top left. */
function lineStrip(scene: Scene, key: string): LineStrip {
  return {
    bake: dynamicTexture(scene, key),
    image: scene.add.image(0, 0, key).setOrigin(0, 0),
  };
}

/**
 * Draws a wall game's field: under the wall, its cells, the floor's band
 * and a dot at each corner its cells share, drawn on a texture, the bake,
 * which one image shows; over the wall, the jump line, with a dot for each
 * brick the level needs left under it once nine or fewer are, in threes,
 * over the guide, and the danger line, which brightens, solid and twice as
 * thick, while such a brick stands at or under the row over it, each line
 * drawn on a strip of its own; and over everything, the lintel over the
 * ceiling and the frame around them all, so nothing that bursts from the
 * wall or flies covers them. It draws them again only once the layout, the
 * scale, the palette, that count or the danger changes, and the bake and
 * the strips once a lost context is restored.
 */
export class FieldPainter<K extends string> implements Painter<
  PaintContext<WallView<K>>
> {
  /** Shows the bake: the cells, the floor's band under them and a dot at each corner the cells share, its top left at the cells'. */
  readonly ground: GameObjects.Image;
  /** Draws the lintel, the ceiling and the frame, over everything else. */
  readonly rim: GameObjects.Graphics;
  /**
   * Holds the jump line's dashes and the danger line's, never shown itself:
   * the strips show them, drawn from it.
   */
  readonly lines: GameObjects.Graphics;
  /** Show the jump line and the danger line, each drawn on a strip across the field from {@link lines}. */
  readonly strips: Readonly<Record<LineName, GameObjects.Image>>;
  /** The jump line's count, a dot for each brick left under it, made once, from its end. */
  readonly countDots: readonly GameObjects.Image[];

  /** The texture the cells, the band and the dots are drawn on. */
  private readonly bake: Textures.DynamicTexture;
  /** The strips the lines are drawn on. */
  private readonly lineStrips: Readonly<Record<LineName, LineStrip>>;
  /** Whether the bake and the strips must be drawn again though nothing was laid out anew: once a lost context is restored. */
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
  /** Where each line runs, worked out once a layout, which its strip covers. */
  private linesAt = NO_LINES;
  private wall: Wall<K> | null = null;
  /** How many bricks the jump line's count shows, 0 where it shows none. */
  private counted = 0;
  /** How far, in device pixels, another dot's edge keeps from a count's dot's: as far as the count's groups stand apart, worked out once a layout. */
  private clearance = 0;
  /** Whether a brick the level needs stands at or under the row over the floor's, which brightens the danger line. */
  private danger = false;

  constructor(
    scene: Scene,
    layers: FieldLayers,
    private readonly art: FieldArt,
    private readonly rules: WallRules<K>,
  ) {
    this.bake = dynamicTexture(scene, FIELD_BAKE);
    this.ground = scene.add.image(0, 0, FIELD_BAKE).setOrigin(0, 0);
    // Off the display list, so a frame never goes through it.
    this.lines = scene.make.graphics({}, false);
    this.lineStrips = {
      jump: lineStrip(scene, LINE_BAKES.jump),
      danger: lineStrip(scene, LINE_BAKES.danger),
    };
    this.strips = {
      jump: this.lineStrips.jump.image,
      danger: this.lineStrips.danger.image,
    };
    this.rim = scene.add.graphics();
    this.countDots = Array.from({ length: MOST_COUNTED }, () =>
      scene.add.image(0, 0, ATLAS, art.countDot).setVisible(false),
    );
    layers.field.add(this.ground);
    layers.lines.add([this.strips.jump, this.strips.danger]);
    layers.count.add([...this.countDots]);
    layers.rim.add(this.rim);
    // The bakes go with a lost context; the atlas is baked anew.
    onContextRestored(scene, () => {
      this.lost = true;
    });
    whenSceneEnds(scene, () => {
      this.lines.destroy();
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

  /** Draws the field as the frame has it, again only where its layout, its scale, its palette, the jump line's count or the danger changed, and bakes it and its lines again once a lost context is restored. */
  draw({
    view,
    shape,
    metrics,
    baked,
    palette,
  }: Readonly<PaintContext<WallView<K>>>): void {
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
      this.linesAt = {
        jump: {
          y: metrics.y + this.thirds.jump * metrics.unit,
          thick: widthOf(JUMP_LINE.width, metrics),
        },
        danger: {
          y: metrics.y + (shape.depth - DANGER_ROW) * metrics.unit,
          thick: widthOf(DANGER_LINE.width, metrics),
        },
      };
      this.clearance =
        (COUNT_PITCH + GROUP_GAP - this.art.countDotWidth) * metrics.unit;
      this.drawRim(metrics, shape, palette);
    }
    const { lost } = this;
    this.lost = false;
    if (laidOut || lost) this.bakeGround(metrics, shape, palette, baked);
    if (this.recount(view.wall, laidOut)) {
      this.drawLines(metrics, palette, baked);
    } else if (!lost) {
      return;
    }
    this.bakeStrip(this.lineStrips.jump, metrics, this.linesAt.jump);
    this.bakeStrip(this.lineStrips.danger, metrics, this.linesAt.danger);
  }

  /**
   * Counts the bricks the level needs under the jump line of a wall, and
   * whether one is in danger, again only for a new wall or a new layout,
   * and returns whether the lines must be drawn again: on a new layout, or
   * as the count or the danger changes.
   */
  private recount(wall: Wall<K>, laidOut: boolean): boolean {
    if (!laidOut && wall === this.wall) return false;
    this.wall = wall;
    const left = neededBelow(wall, this.thirds.jumpLine, this.rules);
    const counted = left <= MOST_COUNTED ? left : 0;
    const danger = inDanger(wall, this.rules);
    if (!laidOut && counted === this.counted && danger === this.danger) {
      return false;
    }
    this.counted = counted;
    this.danger = danger;
    return true;
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
    const dot = bake.manager.getFrame(ATLAS, this.art.gridDot);
    const side = Math.round(dot.width * (unit / baked.unit));
    // From the dot's top left, its scale its own for the layout.
    const stamp = { scale: side / dot.width, originX: 0, originY: 0 };
    for (let row = 1; row < shape.depth; row++) {
      for (let column = 1; column < COLUMNS; column++) {
        bake.stamp(
          ATLAS,
          this.art.gridDot,
          Math.round(column * unit - side / 2),
          Math.round(row * unit - side / 2),
          stamp,
        );
      }
    }
    bake.render();
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
   * Draws on {@link lines} the jump line under the top third, and places
   * its count at its end, a dot for each brick left under it, from the end,
   * where there is one; and the danger line along the top of the floor's
   * row, dashed, or solid and twice as thick while a brick the level needs
   * stands at or under the row over it.
   */
  private drawLines(
    metrics: FieldMetrics,
    palette: WallPalette,
    baked: ArtScale,
  ): void {
    const { x, width, unit } = metrics;
    const { jump, danger } = this.linesAt;
    const counted = this.counted;
    const scale = unit / baked.unit;
    const graphics = this.lines.clear();
    graphics.fillStyle(palette.jumpLine);
    // The dashes stop half a dot's pitch short of the count's last dot.
    this.dashed(
      this.jumpDashes,
      jump.y,
      counted > 0
        ? countDotX(metrics, counted - 1) - (COUNT_PITCH * unit) / 2
        : x + width,
      jump.thick,
    );
    this.countDots.forEach((dot, at) => {
      placeDot(dot, countDotX(metrics, at), jump.y, scale).setVisible(
        at < counted,
      );
    });
    graphics.fillStyle(palette.dangerLine);
    if (this.danger) {
      graphics.fillRect(x, danger.y - danger.thick, width, 2 * danger.thick);
    } else {
      this.dashed(this.dangerDashes, danger.y, x + width, danger.thick);
    }
  }

  /**
   * Draws a line on its strip from what {@link lines} holds, across the
   * cells, on whole pixels, from the line's thickness over its height to as
   * far under it, which holds it dashed and the danger line solid, and
   * shows the strip there.
   */
  private bakeStrip(
    { bake, image }: LineStrip,
    { x, width }: FieldMetrics,
    line: LineAt,
  ): void {
    const left = Math.floor(x);
    const top = Math.floor(line.y - line.thick);
    bake.setSize(
      Math.ceil(x + width) - left,
      Math.ceil(line.y + line.thick) - top,
      false,
    );
    // The image takes up its frame again, so it keeps no size the strip had.
    image.setFrame(image.frame.name).setPosition(left, top);
    bake.clear();
    // Drawn as far up and to the left as the strip stands from the canvas's
    // corner, on whole pixels, so each shape covers the pixels it would.
    bake.draw(this.lines, -left, -top);
    bake.render();
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
