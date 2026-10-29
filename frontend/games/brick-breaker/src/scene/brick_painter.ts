import type { GameObjects, Scene } from "phaser";
import { columnMiddle, columnOf, rowMiddle, rowOf } from "../rules/grid";
import { BRICK_HEIGHT, COLUMNS, ROWS } from "../rules/tuning";
import { brickFrame } from "../view/brick_art";
import { type FieldMetrics, toCanvasX, toCanvasY } from "../view/field_metrics";
import { growScale, popScale, shareDone } from "../view/flourish";
import type { FieldView } from "../view/frame";
import {
  DROP_IN_MS,
  DROP_IN_STAGGER_MS,
  POP_MS,
  REGROW_MS,
} from "../view/timing";
import { ATLAS } from "./atlas";

/** How far above its place a brick starts as it drops in, in field units. */
const DROP_FROM = 2 * BRICK_HEIGHT;

/** Names how a brick moves for a moment: swelling at a hit it holds, or growing back. */
type BrickMove = "pop" | "grow";

/** How each move goes: how long it takes, and its scale a share of the way through. */
const MOVES: Readonly<
  Record<
    BrickMove,
    { readonly ms: number; readonly scale: (done: number) => number }
  >
> = {
  pop: { ms: POP_MS, scale: popScale },
  grow: { ms: REGROW_MS, scale: growScale },
};

/**
 * Draws the bricks: an image for each cell of the grid, made once, each
 * showing its brick's frame or hidden; drops them in as a level starts,
 * swells one at a hit it holds and grows one back.
 */
export class BrickPainter {
  /** An image for each cell, row by row. */
  readonly images: readonly GameObjects.Image[];
  /** The frame each cell shows, or null where it is hidden. */
  private readonly shown: (string | null)[];
  /** How each cell's brick is moving, or null where it is still. */
  private readonly moves: (BrickMove | null)[];
  /** When each cell's move started, in the scene's time. */
  private readonly movedAt: number[];

  constructor(
    private readonly scene: Scene,
    layer: GameObjects.Layer,
  ) {
    this.images = Array.from({ length: COLUMNS * ROWS }, () =>
      scene.add.image(0, 0, ATLAS).setVisible(false),
    );
    this.shown = this.images.map(() => null);
    this.moves = this.images.map(() => null);
    this.movedAt = this.images.map(() => 0);
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

  /** Swells a brick that held a hit, and settles it back. */
  pop(cell: number, now: number): void {
    this.move(cell, "pop", now);
  }

  /** Grows a brick back from nothing. */
  grow(cell: number, now: number): void {
    this.move(cell, "grow", now);
  }

  /** Scales each moving brick for the time, and stills those whose move is over. */
  animate(now: number): void {
    for (let cell = 0; cell < this.moves.length; cell++) {
      const move = this.moves[cell];
      if (!move) continue;
      const { ms, scale } = MOVES[move];
      const done = shareDone(this.movedAt[cell] ?? now, now, ms);
      this.images[cell]?.setScale(scale(done));
      if (done === 1) this.moves[cell] = null;
    }
  }

  /** Stills every brick at its size, as a new field starts. */
  still(): void {
    this.moves.fill(null);
    for (const image of this.images) image.setScale(1);
  }

  /** Starts a brick's move. */
  private move(cell: number, move: BrickMove, now: number): void {
    if (cell < 0 || cell >= this.moves.length) return;
    this.moves[cell] = move;
    this.movedAt[cell] = now;
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
