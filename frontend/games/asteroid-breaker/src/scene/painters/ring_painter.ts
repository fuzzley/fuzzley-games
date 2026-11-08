import type { GameObjects, Scene } from "phaser";
import { type Moving, copyShift } from "../../rules/torus";
import { fadeAlpha, shareDone, spread } from "../../view/effects/flourish";
import { RING_MS } from "../../view/effects/timing";
import { type FieldMetrics, toCanvas } from "../../view/field/field_metrics";
import type { PaintContext, Painter } from "./painter";
import { type Playing, Turns } from "./turns";

/** How many rings may sweep out at once: a blast may set off a crowd of others. */
const POOL = 12;

/** How opaque a ring is as it starts. */
const RING_ALPHA = 0.9;

/** How wide a ring is drawn, in field units. */
const RING_WIDTH = 0.25;

/** Describes a ring sweeping out to its reach, in its color. */
interface Ring extends Playing {
  reach: number;
  color: number;
}

/**
 * Draws the rings that sweep out from a blast, the Nova, a spent Shield and
 * a lost ship, fading as they go, on both sides of an edge they reach
 * across. The scene plays them only where motion is welcome.
 */
export class RingPainter implements Painter {
  /** Every ring sweeping out, drawn again each frame. */
  readonly graphics: GameObjects.Graphics;

  private readonly rings = new Turns<Ring>(POOL, () => ({
    at: -Infinity,
    x: 0,
    y: 0,
    reach: 0,
    color: 0,
  }));
  /** Where a ring's middle is on the field, written each frame. */
  private readonly place: Moving = { x: 0, y: 0 };
  /** Where it is on the canvas, written each frame. */
  private readonly at: Moving = { x: 0, y: 0 };

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.graphics = scene.add.graphics();
    layer.add(this.graphics);
  }

  /** Sweeps a ring out from a place to a reach, in field units, in a color. */
  ring(x: number, y: number, reach: number, color: number, now: number): void {
    const ring = this.rings.play(x, y, now);
    ring.reach = reach;
    ring.color = color;
  }

  /**
   * Draws each ring sweeping out, a share through its time, on both sides of an
   * edge it reaches across.
   */
  draw({ field, metrics, now }: Readonly<PaintContext>): void {
    const { torus } = field;
    const graphics = this.graphics.clear();
    for (const ring of this.rings.all) {
      const done = shareDone(ring.at, now, RING_MS);
      if (done === 1) continue;
      const reach = ring.reach * spread(done);
      graphics.lineStyle(
        RING_WIDTH * metrics.unit,
        ring.color,
        RING_ALPHA * fadeAlpha(done),
      );
      const across = copyShift(ring.x, reach, torus.width) * torus.width;
      const down = copyShift(ring.y, reach, torus.height) * torus.height;
      this.stroke(ring.x, ring.y, reach, metrics);
      if (across !== 0) {
        this.stroke(ring.x + across, ring.y, reach, metrics);
      }
      if (down !== 0) {
        this.stroke(ring.x, ring.y + down, reach, metrics);
      }
      if (across !== 0 && down !== 0) {
        this.stroke(ring.x + across, ring.y + down, reach, metrics);
      }
    }
  }

  /** Stops every ring, as a new field starts. */
  reset(): void {
    for (const ring of this.rings.all) ring.at = -Infinity;
  }

  /** Strokes one of a ring's copies about a place on the field, out to a reach, in field units. */
  private stroke(
    x: number,
    y: number,
    reach: number,
    metrics: FieldMetrics,
  ): void {
    this.place.x = x;
    this.place.y = y;
    toCanvas(metrics, this.place, this.at);
    this.graphics.strokeCircle(this.at.x, this.at.y, reach * metrics.unit);
  }
}
