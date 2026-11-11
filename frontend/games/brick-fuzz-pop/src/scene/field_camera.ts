import type { PixelRect } from "@fz/phaser/layout";
import type { Cameras } from "phaser";
import { type Shift, shakeOf } from "../view/effects/flourish";
import { SHAKE_MS } from "../view/effects/timing";
import type { FieldMetrics, FieldShape } from "../view/field/field_metrics";
import { frameBounds } from "./painters/field_painter";
import type { PaintContext, Painter } from "./painters/painter";

/**
 * Frames the scene's camera on the field, and moves it as a lost level's
 * shake has the field, the one place its viewport is written.
 *
 * Its viewport is the frame's outer edge, so nothing drawn shows past the
 * frame, and it shows the canvas's own pixels, so a place on the canvas is
 * the same in its world. A shake moves the viewport, so the field and its
 * frame shake whole together.
 */
export class FieldCamera implements Painter {
  /** Where the viewport rests on the canvas: the frame's outer edge, in device pixels. */
  private rest: PixelRect = { x: 0, y: 0, width: 0, height: 0 };
  /** When the level was lost, in the scene's time. */
  private shakenAt = Number.NEGATIVE_INFINITY;
  /** Whether the field is shaken from where it rests. */
  private shaken = false;
  /** How far the shake moves the field, written each frame it shakes. */
  private readonly shift: Shift = { x: 0, y: 0 };

  constructor(private readonly camera: Cameras.Scene2D.Camera) {}

  /** Frames the camera on the field as it is laid out in a shape, at rest. */
  fit(metrics: FieldMetrics, shape: FieldShape): void {
    const rest = frameBounds(metrics, shape);
    this.rest = rest;
    this.camera
      .setViewport(rest.x, rest.y, rest.width, rest.height)
      .setScroll(rest.x, rest.y);
  }

  /** Shakes the field, from a time. */
  shake(now: number): void {
    this.shakenAt = now;
    this.shaken = true;
  }

  /**
   * Moves the viewport, and the field framed in it, as a lost level's shake
   * has the field at the scene's time, by whole device pixels, so the frame
   * stays whole, and back to rest once it is over.
   */
  draw({
    now,
    metrics,
  }: Readonly<Pick<PaintContext, "now" | "metrics">>): void {
    if (!this.shaken) return;
    const since = now - this.shakenAt;
    const { x, y } = shakeOf(since, metrics.pixelRatio, this.shift);
    this.camera.setPosition(
      this.rest.x - Math.round(x),
      this.rest.y - Math.round(y),
    );
    if (since >= SHAKE_MS) this.shaken = false;
  }
}
