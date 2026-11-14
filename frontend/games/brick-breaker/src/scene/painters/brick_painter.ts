import { easeOutCubic, shareDone } from "@fz/core/math";
import type { GameObjects, Scene } from "phaser";
import { cellMiddleX, cellMiddleY, columnOf } from "../../rules/grid";
import { BRICK_WIDTH, COLUMNS, ROWS } from "../../rules/tuning";
import { cellFrame } from "../../view/art/brick_art";
import {
  dropInAlpha,
  dropInHeight,
  popScale,
} from "../../view/effects/flourish";
import {
  DROP_IN_MS,
  POP_MS,
  REGROW_MS,
  SLIDE_MS,
} from "../../view/effects/timing";
import {
  type FieldMetrics,
  toCanvasX,
  toCanvasY,
} from "../../view/field/field_metrics";
import type { FieldView } from "../../view/field/frame";
import { ATLAS } from "../atlas";
import type { PaintContext, Painter } from "./painter";

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
  grow: { ms: REGROW_MS, scale: easeOutCubic },
};

/**
 * Draws the bricks: an image for each cell of the grid, made once, each
 * showing its brick's frame, a broken regrowing brick's ring as it grows
 * back, or hidden; drops them in as a level starts, a column after a
 * column, each drawn its column's height above its place, landing as the
 * drop-in ends or at once at a key; swells one at a hit it holds and grows
 * one back; and slides a slider in from the cell it left, with whatever
 * move it had under way there, in place of any left in the cell it takes.
 */
export class BrickPainter implements Painter {
  /** An image for each cell, row by row. */
  readonly images: readonly GameObjects.Image[];
  /** The frame each cell shows, or null where it is hidden. */
  private readonly shown: (string | null)[];
  /** How each cell's brick is moving, or null where it is still. */
  private readonly moves: (BrickMove | null)[];
  /** When each cell's move started, in the scene's time. */
  private readonly movedAt: number[];
  /** When the bricks began to drop in, in the flourishes' time, or -Infinity once they are landed. */
  private droppedAt = -Infinity;
  /** When each cell's brick slid into it, in the flourishes' time, or -Infinity. */
  private readonly slidAt: number[];
  /** The way each cell's brick slid into it, 1 right or -1 left. */
  private readonly slidWay: number[];
  /** When the last slide began, in the flourishes' time, or -Infinity. */
  private lastSlidAt = -Infinity;
  /**
   * Whether every image stands at its place, so a frame needn't put it
   * there; an offset `place()` adds, as the drop-in's is, keeps it false
   * while it moves a brick.
   */
  private placed = false;

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.images = Array.from({ length: COLUMNS * ROWS }, () =>
      scene.add.image(0, 0, ATLAS).setVisible(false),
    );
    this.shown = this.images.map(() => null);
    this.moves = this.images.map(() => null);
    this.movedAt = this.images.map(() => 0);
    this.slidAt = this.images.map(() => -Infinity);
    this.slidWay = this.images.map(() => 0);
    layer.add([...this.images]);
  }

  /** Has each cell's image put at its place as it is next drawn, as the field is laid out again. */
  layout(): void {
    this.placed = false;
  }

  /** Shows each cell's brick as it stands, changing only the images whose brick changed. */
  show(field: FieldView): void {
    for (let cell = 0; cell < this.images.length; cell++) {
      const brick = field.bricks[cell];
      const frame = brick ? cellFrame(brick, field) : null;
      if (frame === this.shown[cell]) continue;
      this.shown[cell] = frame;
      const image = this.images[cell];
      image?.setVisible(frame !== null);
      if (frame) image?.setFrame(frame);
    }
  }

  /**
   * Shows each cell's brick as it stands, each moving brick scaled for the
   * time, and each dropping in where its column has come to.
   */
  draw({ field, metrics, now }: Readonly<PaintContext>): void {
    this.show(field);
    this.animate(now);
    this.place(metrics, now);
  }

  /** Swells a brick that held a hit, and settles it back. */
  pop(cell: number, now: number): void {
    this.move(cell, "pop", now);
  }

  /** Grows a brick back from nothing. */
  grow(cell: number, now: number): void {
    this.move(cell, "grow", now);
  }

  /**
   * Slides a slider that stepped into a cell, its way, from the cell it
   * left, carrying the move it had under way there, and stilling any left
   * in the cell it took, as a brick that swelled there and broke leaves one.
   *
   * A train's slides come lead first, as the field records them, so each
   * slider's move is carried on before the one behind it takes its cell.
   */
  slide(cell: number, way: number, now: number): void {
    if (cell < 0 || cell >= this.slidAt.length) return;
    this.carryMove(cell - way, cell);
    this.slidAt[cell] = now;
    this.slidWay[cell] = way;
    this.lastSlidAt = now;
    this.placed = false;
  }

  /** Scales each moving brick for the time, and stills those whose move is over. */
  private animate(now: number): void {
    for (let cell = 0; cell < this.moves.length; cell++) {
      const move = this.moves[cell];
      if (!move) continue;
      const { ms, scale } = MOVES[move];
      const done = shareDone(this.movedAt[cell] ?? now, now, ms);
      this.images[cell]?.setScale(scale(done));
      if (done === 1) this.moves[cell] = null;
    }
  }

  /** Stills every brick, at its size and at its place, as a new field starts. */
  still(): void {
    this.moves.fill(null);
    for (const image of this.images) image.setScale(1);
    this.slidAt.fill(-Infinity);
    this.lastSlidAt = -Infinity;
    this.land();
  }

  /** Drops the bricks in from now, a column after a column, as a level starts. */
  dropIn(now: number): void {
    this.droppedAt = now;
    this.placed = false;
  }

  /** Lands every brick dropping in at once, as a key skips the drop-in. */
  land(): void {
    this.droppedAt = -Infinity;
  }

  /**
   * Carries a brick's move, as far as it has come, from the cell it left to
   * the one it stepped into, in place of any move left there, and leaves
   * both cells at their size but for the move carried.
   */
  private carryMove(from: number, to: number): void {
    if (from < 0 || from >= this.moves.length) return;
    const move = this.moves[from] ?? null;
    this.moves[to] = move;
    this.movedAt[to] = this.movedAt[from] ?? 0;
    this.moves[from] = null;
    this.images[from]?.setScale(1);
    if (!move) this.images[to]?.setScale(1);
  }

  /** Starts a brick's move. */
  private move(cell: number, move: BrickMove, now: number): void {
    if (cell < 0 || cell >= this.moves.length) return;
    this.moves[cell] = move;
    this.movedAt[cell] = now;
  }

  /**
   * Puts each cell's image at its place on the field, its column's height
   * above it and faded as far while the bricks drop in, unless every image
   * already stands at its place.
   */
  private place(metrics: FieldMetrics, now: number): void {
    if (this.placed) return;
    const done = shareDone(this.droppedAt, now, DROP_IN_MS);
    for (let cell = 0; cell < this.images.length; cell++) {
      const column = columnOf(cell);
      this.images[cell]
        ?.setPosition(
          toCanvasX(metrics, cellMiddleX(cell) + this.slideOffsetOf(cell, now)),
          toCanvasY(metrics, cellMiddleY(cell) - dropInHeight(column, done)),
        )
        .setAlpha(dropInAlpha(column, done));
    }
    this.placed = done === 1 && !this.isSliding(now);
  }

  /**
   * Returns how far across a cell's brick is drawn from its place as it
   * slides, in field units: from the cell it left, easing to none.
   */
  slideOffsetOf(cell: number, now: number): number {
    const done = shareDone(this.slidAt[cell] ?? -Infinity, now, SLIDE_MS);
    return -(this.slidWay[cell] ?? 0) * BRICK_WIDTH * (1 - easeOutCubic(done));
  }

  /** Returns whether a brick is sliding still. */
  private isSliding(now: number): boolean {
    return shareDone(this.lastSlidAt, now, SLIDE_MS) < 1;
  }
}
