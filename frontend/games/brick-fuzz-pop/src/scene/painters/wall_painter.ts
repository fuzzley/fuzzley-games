import { shareDone } from "@fz/core/math";
import type { GameObjects, Scene } from "phaser";
import { cellAt, columnOf, fieldRowOf } from "../../rules/grid";
import { COLUMNS, MOST_DEPTH } from "../../rules/tuning";
import type { Wall } from "../../rules/wall/wall";
import { brickLayers } from "../../view/art/art";
import type { FrameName } from "../../view/art/frames";
import { swellScale } from "../../view/effects/flourish";
import { SWELL_MS } from "../../view/effects/timing";
import type { FieldMetrics } from "../../view/field/field_metrics";
import { ATLAS } from "../atlas";
import { DANGER_ROW, endangers } from "../danger";
import { FIELD_FRAMES } from "../field_art";
import type { PaintContext, Painter } from "./painter";

/** The most frames a brick shows stacked in its cell: a tough brick's tile, pips and cracks. */
export const MOST_LAYERS = 3;

/** The frames a cell shows where no brick stands. */
const NO_LAYERS: readonly FrameName[] = [];

/**
 * Returns how much of a cell's top a wall easing down from over the ceiling
 * has cut off along it, in device pixels: none for a cell under it, up to
 * the whole cell, which shows none of it.
 */
export function cutOver(
  cellTop: number,
  ceiling: number,
  side: number,
): number {
  return Math.min(side, Math.max(0, ceiling - cellTop));
}

/**
 * Draws the wall: a stack of images in each cell of the deepest field, made
 * once, each showing a frame of its brick, from the bottom up, or hidden;
 * and eases the wall down a row or a jump as the view's `wallDrop` goes
 * from 0 to 1, where the player welcomes motion, the rows coming in from
 * over the ceiling cut off along it. Each brick the level needs at or
 * under the row over the floor's, one step from losing the level or losing
 * it, takes the warning frame over its stack, which comes down with it. A
 * brick struck swells and settles.
 *
 * The view hands over the wall that comes down at once, with `wallDrop` 0,
 * and keeps it at 1 while the wall stands still, so the wall eases from
 * the row it last stood still on to the one it now stands on; a wall that
 * rises, as a new level's may, stands where it is at once. It hands over
 * another wall each frame a brick changes, so the wall is drawn again only
 * as another is handed over.
 */
export class WallPainter implements Painter {
  /** The images of each cell of the deepest field, row by row from the floor, each cell's from the bottom of its stack up. */
  readonly images: readonly GameObjects.Image[];
  /** The warning frame over each cell of the floor's row and the row over it, made once, row by row from the floor, shown where a brick the level needs stands. */
  readonly warnings: readonly GameObjects.Image[];
  /** The frame each image shows, or null where it is hidden. */
  private readonly shown: (FrameName | null)[];
  /** When the brick in each field cell was last struck, in the scene's time, by field cell, or −Infinity while it doesn't swell. */
  private readonly struckAt = new Float64Array(MOST_DEPTH * COLUMNS).fill(
    Number.NEGATIVE_INFINITY,
  );
  /** The field row the wall's lowest row last stood still in, or null before the first frame. */
  private still: number | null = null;
  /** The wall drawn, how far it was drawn over its place, the layout and the depth, so a frame where none changed draws nothing. */
  private drawn: {
    wall: Wall | null;
    over: number;
    metrics: FieldMetrics | null;
    depth: number;
  } = { wall: null, over: 0, metrics: null, depth: 0 };

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.images = Array.from(
      { length: MOST_DEPTH * COLUMNS * MOST_LAYERS },
      () => scene.add.image(0, 0, ATLAS).setVisible(false),
    );
    this.warnings = Array.from({ length: (DANGER_ROW + 1) * COLUMNS }, () =>
      scene.add.image(0, 0, ATLAS, FIELD_FRAMES.warning).setVisible(false),
    );
    this.shown = this.images.map(() => null);
    layer.add([...this.images, ...this.warnings]);
  }

  /**
   * Returns the wall last drawn, or null before the first frame: where the
   * bricks show, and what they were, a brick the flight broke since the
   * last frame among them. The view writes over a wall it handed over only
   * two walls later, so the one drawn the frame before holds its bricks
   * through the next.
   */
  drawnWall(): Wall | null {
    return this.drawn.wall;
  }

  /** Swells the brick struck in a wall cell, from a time, if it stands in the field. */
  swell(wall: Wall, cell: number, now: number): void {
    const row = fieldRowOf(wall, cell);
    if (row < 0 || row >= MOST_DEPTH) return;
    this.struckAt[row * COLUMNS + columnOf(cell)] = now;
  }

  /** Draws the wall as the view has it, eased down where it comes down, changing only what moved or changed, and swells each brick struck. */
  draw({
    view,
    shape,
    metrics,
    baked,
    motion,
    now,
  }: Readonly<PaintContext>): void {
    const { wall } = view;
    const done = motion ? Math.min(1, Math.max(0, view.wallDrop)) : 1;
    if (this.still === null || done === 1 || wall.lowestRow > this.still) {
      this.still = wall.lowestRow;
    }
    const over = Math.round(
      (this.still - wall.lowestRow) * (1 - done) * metrics.unit,
    );
    const scale = metrics.unit / baked.unit;
    const drawn = this.drawn;
    if (
      wall !== drawn.wall ||
      over !== drawn.over ||
      metrics !== drawn.metrics ||
      shape.depth !== drawn.depth
    ) {
      if (wall.lowestRow !== drawn.wall?.lowestRow) {
        // A brick swelling would swell another, as each field row now
        // shows another of the wall's.
        this.struckAt.fill(Number.NEGATIVE_INFINITY);
      }
      drawn.wall = wall;
      drawn.over = over;
      drawn.metrics = metrics;
      drawn.depth = shape.depth;
      this.layOut(wall, metrics, shape.depth, over, scale);
    }
    this.swellStruck(now, scale);
  }

  /**
   * Shows every brick of a wall in its cell, its stack of frames scaled, the
   * wall drawn some device pixels over its place, and the warning frames
   * over those one step from losing the level.
   */
  private layOut(
    wall: Wall,
    metrics: FieldMetrics,
    depth: number,
    over: number,
    scale: number,
  ): void {
    const { x, y, unit } = metrics;
    let at = 0;
    for (const image of this.images) {
      const layer = at % MOST_LAYERS;
      const cell = (at - layer) / MOST_LAYERS;
      const row = Math.floor(cell / COLUMNS);
      const column = cell % COLUMNS;
      const top = y + (depth - 1 - row) * unit - over;
      const cut = cutOver(top, y, unit);
      const frame =
        cut < unit ? (layersAt(wall, row, column)[layer] ?? null) : null;
      this.show(image, at, frame, x + (column + 0.5) * unit, top + unit / 2);
      this.cut(image, frame === null ? 0 : cut, scale);
      at++;
    }
    // The rows the frames stand in never stand over the ceiling, even
    // eased down a jump, so they are never cut.
    let spot = 0;
    for (const warning of this.warnings) {
      const row = Math.floor(spot / COLUMNS);
      const column = spot % COLUMNS;
      const top = y + (depth - 1 - row) * unit - over;
      warning
        .setPosition(x + (column + 0.5) * unit, top + unit / 2)
        .setScale(scale)
        .setVisible(endangers(wall, column, row));
      spot++;
    }
  }

  /**
   * Scales each struck brick's stack as its swell has it at a time, and
   * back to the scale of the rest once its swell is over.
   */
  private swellStruck(now: number, scale: number): void {
    const struckAt = this.struckAt;
    for (let cell = 0; cell < struckAt.length; cell++) {
      const at = struckAt[cell] ?? Number.NEGATIVE_INFINITY;
      if (at === Number.NEGATIVE_INFINITY) continue;
      const done = shareDone(at, now, SWELL_MS);
      const swollen = scale * swellScale(done);
      for (let layer = 0; layer < MOST_LAYERS; layer++) {
        this.images[cell * MOST_LAYERS + layer]?.setScale(swollen);
      }
      if (done === 1) struckAt[cell] = Number.NEGATIVE_INFINITY;
    }
  }

  /** Shows a frame in the image at a place in the pool, its middle at a place, or hides it where it shows none. */
  private show(
    image: GameObjects.Image,
    at: number,
    frame: FrameName | null,
    x: number,
    y: number,
  ): void {
    if (frame !== this.shown[at]) {
      this.shown[at] = frame;
      if (frame === null) image.setVisible(false);
      else image.setFrame(frame).setVisible(true);
    }
    image.setPosition(x, y);
  }

  /** Scales an image's frame, and cuts some device pixels off its top, or none. */
  private cut(image: GameObjects.Image, cut: number, scale: number): void {
    image.setScale(scale);
    if (cut > 0) {
      // A crop is in the frame's own pixels, which the image shows scaled.
      const { width, height } = image.frame;
      image.setCrop(0, cut / scale, width, height - cut / scale);
    } else if (image.isCropped) {
      image.setCrop();
    }
  }
}

/**
 * Returns the frames a brick shows in a field row and column of a wall, or
 * none where no brick stands there, as in a row under the wall or over it,
 * past either end of its bricks.
 */
function layersAt(
  wall: Wall,
  row: number,
  column: number,
): readonly FrameName[] {
  const brick = wall.bricks[cellAt(wall, column, row)];
  return brick ? brickLayers(brick) : NO_LAYERS;
}
