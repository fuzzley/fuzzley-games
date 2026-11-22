import { shareDone } from "@fz/core/math";
import type { GameObjects, Scene } from "phaser";
import type { GuideDots } from "../../rules/field/guide";
import type { Cells } from "../../rules/field/travel";
import { COLUMNS, MOST_GUIDE_DOTS, ROWS } from "../../rules/tuning";
import { GUIDE_FRAMES } from "../../view/art/guide_art";
import { GUIDE_FADE_MS } from "../../view/effects/timing";
import {
  type FieldMetrics,
  toCanvasX,
  toCanvasY,
} from "../../view/field/field_metrics";
import { ATLAS } from "../atlas";
import type { BrickPainter } from "./brick_painter";
import type { PaintContext, Painter } from "./painter";

/**
 * The most bricks the guide outlines: as many cells as the two edges of the
 * ball's way cross on the grid, a row and a column's worth each, as a fire
 * ball passing through every brick it meets may mark. The ball is narrower
 * than a cell, so every cell it meets lies on one edge or the other.
 */
export const MOST_OUTLINED = 2 * (ROWS + COLUMNS);

/**
 * Draws the serve's guide while it shows: its dots, and an outline over each
 * brick it marks, where the bricks' painter draws that brick, so it follows a
 * brick as it drops in or slides.
 */
export class GuidePainter implements Painter {
  /** A dot for each place the guide may show, made once. */
  readonly dots: readonly GameObjects.Image[];
  /** An outline for each brick the guide may mark, made once. */
  readonly outlines: readonly GameObjects.Image[];
  /** When the guide began to show, in the flourishes' time, or null while none shows. */
  private shownAt: number | null = null;

  constructor(
    scene: Scene,
    /** The layer the guide is drawn in, which only it fills. */
    readonly layer: GameObjects.Layer,
    /** The bricks' painter, where each outlined brick is drawn. */
    private readonly bricks: Pick<BrickPainter, "images">,
  ) {
    this.outlines = Array.from({ length: MOST_OUTLINED }, () =>
      scene.add.image(0, 0, ATLAS, GUIDE_FRAMES.outline).setVisible(false),
    );
    this.dots = Array.from({ length: MOST_GUIDE_DOTS }, () =>
      scene.add.image(0, 0, ATLAS, GUIDE_FRAMES.dot).setVisible(false),
    );
    layer.add([...this.outlines, ...this.dots]);
    layer.setVisible(false);
  }

  /** Draws the guide the frame hands over, fading it in from when it began to show, or hides it while none shows. */
  draw({ guide, metrics, now, motion }: Readonly<PaintContext>): void {
    if (guide === null) {
      this.shownAt = null;
      this.layer.setVisible(false);
      return;
    }
    this.shownAt ??= now;
    this.layer
      .setVisible(true)
      .setAlpha(motion ? shareDone(this.shownAt, now, GUIDE_FADE_MS) : 1);
    this.drawDots(guide.dots, metrics);
    this.drawOutlines(guide.marked);
  }

  /** Shows a dot at each of the guide's places, its edges on whole pixels, and hides the rest. */
  private drawDots(dots: Readonly<GuideDots>, metrics: FieldMetrics): void {
    let at = 0;
    for (const dot of this.dots) {
      const place = at < dots.count ? dots.places[at] : undefined;
      at++;
      dot.setVisible(place !== undefined);
      if (!place) continue;
      const x = onWholePixels(toCanvasX(metrics, place.x), dot.width);
      const y = onWholePixels(toCanvasY(metrics, place.y), dot.height);
      if (dot.x !== x || dot.y !== y) dot.setPosition(x, y);
    }
  }

  /** Shows an outline over each brick the guide marks, where the brick is drawn, and hides the rest. */
  private drawOutlines(marked: Readonly<Cells>): void {
    let at = 0;
    for (const outline of this.outlines) {
      const cell = at < marked.count ? marked.cells[at] : undefined;
      at++;
      const brick = cell === undefined ? undefined : this.bricks.images[cell];
      outline.setVisible(brick !== undefined);
      if (!brick) continue;
      if (outline.x !== brick.x || outline.y !== brick.y) {
        outline.setPosition(brick.x, brick.y);
      }
    }
  }
}

/** Returns where the middle of something some whole device pixels wide stands about a point, so that its edges fall on whole pixels. */
function onWholePixels(middle: number, side: number): number {
  return Math.round(middle - side / 2) + side / 2;
}
