import type { Cameras } from "phaser";
import type { Moving } from "../rules/torus";
import { type Jolts, cameraShift } from "../view/effects/flourish";
import type { FieldMetrics } from "../view/field/field_metrics";
import type { PaintContext, Painter } from "./painters/painter";

/**
 * Points the field's camera at the field, fills it with the field's color,
 * and scrolls it from where it rests as the field kicks and shakes, the one
 * place its scroll is written.
 *
 * Its viewport is the field's rectangle, so whatever lies past an edge is
 * cut off there, and it shows the canvas's own pixels, so a place on the
 * canvas is the same in its world.
 */
export class FieldCamera implements Painter {
  /** What last jolted the field. */
  private readonly jolts: Jolts = {
    kickedAt: -Infinity,
    wayX: 0,
    wayY: 0,
    lostAt: -Infinity,
  };
  /** How far the camera is scrolled from where it rests, written each frame. */
  private readonly shift: Moving = { x: 0, y: 0 };

  constructor(private readonly camera: Cameras.Scene2D.Camera) {}

  /** Lays the camera over the field as it lies on the canvas. */
  fit(metrics: FieldMetrics): void {
    const { x, y, width, height } = metrics;
    this.camera.setViewport(x, y, width, height);
    this.scrollOver(metrics);
  }

  /** Fills the field with a color, under all that is drawn on it. */
  fill(color: number): void {
    this.camera.setBackgroundColor(color);
  }

  /** Kicks the field the way a blow came, a share along each axis. */
  kick(wayX: number, wayY: number, now: number): void {
    this.jolts.kickedAt = now;
    this.jolts.wayX = wayX;
    this.jolts.wayY = wayY;
  }

  /** Shakes the field, from a ship lost, after a moment's pause. */
  shake(now: number): void {
    this.jolts.lostAt = now;
  }

  /**
   * Scrolls the camera from where it rests by the field's kick and its shake at
   * the scene's time.
   */
  draw({
    metrics,
    now,
  }: Readonly<Pick<PaintContext, "metrics" | "now">>): void {
    cameraShift(this.jolts, now, metrics.pixelRatio, this.shift);
    this.scrollOver(metrics);
  }

  /** Rests the field, as a new field starts. */
  reset(): void {
    this.jolts.kickedAt = -Infinity;
    this.jolts.lostAt = -Infinity;
  }

  /** Scrolls the camera to the field's corner on the canvas, shifted as last worked out. */
  private scrollOver(metrics: FieldMetrics): void {
    this.camera.setScroll(metrics.x + this.shift.x, metrics.y + this.shift.y);
  }
}
