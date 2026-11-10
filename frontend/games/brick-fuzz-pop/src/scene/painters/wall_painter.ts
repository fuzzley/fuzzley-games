import type { GameObjects, Scene } from "phaser";
import { cellAt } from "../../rules/grid";
import { COLUMNS, MOST_DEPTH } from "../../rules/tuning";
import type { Wall } from "../../rules/wall/wall";
import { brickLayers } from "../../view/art/art";
import type { FrameName } from "../../view/art/frames";
import type { FieldMetrics } from "../../view/field/field_metrics";
import { ATLAS } from "../atlas";
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
 * over the ceiling cut off along it.
 *
 * The view hands over the wall that comes down at once, with `wallDrop` 0,
 * and keeps it at 1 while the wall stands still, so the wall eases from
 * the row it last stood still on to the one it now stands on; a wall that
 * rises, as a new level's may, stands where it is at once.
 */
export class WallPainter implements Painter {
  /** The images of each cell of the deepest field, row by row from the floor, each cell's from the bottom of its stack up. */
  readonly images: readonly GameObjects.Image[];
  /** The frame each image shows, or null where it is hidden. */
  private readonly shown: (FrameName | null)[];
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
    this.shown = this.images.map(() => null);
    layer.add([...this.images]);
  }

  /** Draws the wall as the view has it, eased down where it comes down, changing only what moved or changed. */
  draw({ view, shape, metrics, baked, motion }: Readonly<PaintContext>): void {
    const { wall } = view;
    const done = motion ? Math.min(1, Math.max(0, view.wallDrop)) : 1;
    if (this.still === null || done === 1 || wall.lowestRow > this.still) {
      this.still = wall.lowestRow;
    }
    const over = Math.round(
      (this.still - wall.lowestRow) * (1 - done) * metrics.unit,
    );
    const drawn = this.drawn;
    if (
      wall === drawn.wall &&
      over === drawn.over &&
      metrics === drawn.metrics &&
      shape.depth === drawn.depth
    ) {
      return;
    }
    drawn.wall = wall;
    drawn.over = over;
    drawn.metrics = metrics;
    drawn.depth = shape.depth;
    const { x, y, unit } = metrics;
    const scale = unit / baked.unit;
    let at = 0;
    for (const image of this.images) {
      const layer = at % MOST_LAYERS;
      const cell = (at - layer) / MOST_LAYERS;
      const row = Math.floor(cell / COLUMNS);
      const column = cell % COLUMNS;
      const top = y + (shape.depth - 1 - row) * unit - over;
      const cut = cutOver(top, y, unit);
      const frame =
        cut < unit ? (layersAt(wall, row, column)[layer] ?? null) : null;
      this.show(image, at, frame, x + (column + 0.5) * unit, top + unit / 2);
      this.cut(image, frame === null ? 0 : cut, scale);
      at++;
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
