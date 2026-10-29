import type { GameObjects, Scene } from "phaser";
import { columnMiddle, columnOf, rowMiddle, rowOf } from "../rules/grid";
import { BRICK_HEIGHT, COLUMNS, ROWS } from "../rules/tuning";
import { brickFrame } from "../view/art";
import { type FieldMetrics, toCanvasX, toCanvasY } from "../view/field_metrics";
import type { FieldView } from "../view/frame";
import { DROP_IN_MS, DROP_IN_STAGGER_MS } from "../view/timing";
import { ATLAS } from "./atlas";

/** How far above its place a brick starts as it drops in, in field units. */
const DROP_FROM = 2 * BRICK_HEIGHT;

/**
 * Draws the bricks: an image for each cell of the grid, made once, each
 * showing its brick's frame or hidden, and drops them in as a level starts.
 */
export class BrickPainter {
  /** An image for each cell, row by row. */
  readonly images: readonly GameObjects.Image[];
  /** The frame each cell shows, or null where it is hidden. */
  private readonly shown: (string | null)[];

  constructor(
    private readonly scene: Scene,
    layer: GameObjects.Layer,
  ) {
    this.images = Array.from({ length: COLUMNS * ROWS }, () =>
      scene.add.image(0, 0, ATLAS).setVisible(false),
    );
    this.shown = this.images.map(() => null);
    layer.add([...this.images]);
  }

  /** Puts each cell's image at its place on the field, and ends any drop. */
  layout(metrics: FieldMetrics): void {
    this.scene.tweens.killTweensOf(this.images);
    this.images.forEach((image, cell) => {
      image
        .setPosition(
          toCanvasX(metrics, columnMiddle(columnOf(cell))),
          toCanvasY(metrics, rowMiddle(rowOf(cell))),
        )
        .setAlpha(1);
    });
  }

  /** Takes up each image's frame again, once the atlas has been baked again. */
  refresh(): void {
    this.images.forEach((image, cell) => {
      const frame = this.shown[cell];
      if (frame) image.setFrame(frame);
    });
  }

  /** Shows each cell's brick as it stands, changing only the images whose brick changed. */
  show(field: FieldView): void {
    this.images.forEach((image, cell) => {
      const brick = field.bricks[cell];
      const frame = brick && !brick.broken ? brickFrame(brick) : null;
      if (frame === this.shown[cell]) return;
      this.shown[cell] = frame;
      image.setVisible(frame !== null);
      if (frame) image.setFrame(frame);
    });
  }

  /** Drops the bricks into place, a row at a time from the top, as a level starts. */
  dropIn(metrics: FieldMetrics): void {
    this.layout(metrics);
    this.images.forEach((image, cell) => {
      const restY = image.y;
      image.setY(restY - DROP_FROM * metrics.unit).setAlpha(0);
      this.scene.tweens.add({
        targets: image,
        y: restY,
        alpha: 1,
        duration: DROP_IN_MS,
        delay: rowOf(cell) * DROP_IN_STAGGER_MS,
        ease: "Cubic.Out",
      });
    });
  }
}
