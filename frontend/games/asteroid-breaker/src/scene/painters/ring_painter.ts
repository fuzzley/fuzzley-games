import { easeOutCubic, fadeAlpha, shareDone } from "@fz/core/math";
import { type Playing, Turns } from "@fz/core/turns";
import type { GameObjects, Scene } from "phaser";
import { type Moving, copyOffsets } from "../../rules/torus";
import { type Energy, energyOf } from "../../view/art/energy";
import type { BeltPalette } from "../../view/colors/palette";
import {
  WAVE_RING,
  type WaveRing,
  waveRingAt,
} from "../../view/effects/cleared";
import { RING_MS } from "../../view/effects/timing";
import { type FieldMetrics, toCanvas } from "../../view/field/field_metrics";
import type { PaintContext, Painter } from "./painter";
import { strokeRound } from "./rounds";

/** How many rings may sweep out at once. */
const POOL = 12;

/** How opaque a ring is as it starts. */
const RING_ALPHA = 0.9;

/** How wide a ring is drawn, in field units. */
export const RING_WIDTH = 0.25;

/** Describes a ring sweeping out to its reach, in its color. */
interface Ring extends Playing {
  reach: number;
  color: number;
}

/**
 * Draws the rings that sweep out from a spent Shield and a lost pod,
 * fading as they go, on both sides of an edge they reach across; and the
 * wave's ring, which crosses the whole field from where its last rock went
 * as the view's `cleared.ts` says, once, for the field's camera to cut off
 * at its edges, its soft outside and its line each a band, as the
 * accent's energy. The scene plays them only where motion is welcome.
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
  /** How far a ring's copies past the edges are from it on the field, written each frame. */
  private readonly offsets: Moving = { x: 0, y: 0 };
  /** Where a copy's middle is on the canvas, written each frame. */
  private readonly at: Moving = { x: 0, y: 0 };
  /** The wave's ring: when it starts, where and how far it crosses to, or never. */
  private readonly waved: Playing & { reach: number } = {
    at: -Infinity,
    x: 0,
    y: 0,
    reach: 0,
  };
  /** The wave's ring as it shows, written each frame. */
  private readonly waveShown: WaveRing = { radius: 0, shown: 0 };
  /** The palette the wave's ring's tones were last taken for, or null before. */
  private toned: BeltPalette | null = null;
  /** The accent's energy, the wave's ring's tones, in that palette. */
  private tones: Energy | null = null;

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

  /** Crosses the field with the wave's ring from a place to a reach, in field units, from a time on, in place of the last. */
  wave(x: number, y: number, reach: number, at: number): void {
    const { waved } = this;
    waved.at = at;
    waved.x = x;
    waved.y = y;
    waved.reach = reach;
  }

  /**
   * Draws each ring sweeping out, a share through its time, on both sides of an
   * edge it reaches across, and the wave's ring.
   */
  draw({ field, metrics, now, palette }: Readonly<PaintContext>): void {
    const { torus } = field;
    const graphics = this.graphics.clear();
    for (const ring of this.rings.all) {
      const done = shareDone(ring.at, now, RING_MS);
      if (done === 1) continue;
      const reach = ring.reach * easeOutCubic(done);
      graphics.lineStyle(
        RING_WIDTH * metrics.unit,
        ring.color,
        RING_ALPHA * fadeAlpha(done),
      );
      // The stroke is centered on the circle, so half its width lies past it.
      const { x: across, y: down } = copyOffsets(
        ring.x,
        ring.y,
        reach + RING_WIDTH / 2,
        torus,
        this.offsets,
      );
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
    this.drawWave(now, palette, metrics);
  }

  /** Stops every ring, the wave's too, as a new field starts. */
  start(): void {
    for (const ring of this.rings.all) ring.at = -Infinity;
    this.waved.at = -Infinity;
  }

  /** Draws the wave's ring as it crosses the field at a time, once, its soft outside under its line. */
  private drawWave(
    now: number,
    palette: BeltPalette,
    metrics: FieldMetrics,
  ): void {
    const { waved, graphics } = this;
    const ring = waveRingAt(now - waved.at, waved.reach, this.waveShown);
    if (ring === null) return;
    const { halo, body } = this.tonesFor(palette);
    const { unit, pixelRatio } = metrics;
    const { x, y } = toCanvas(metrics, waved.x, waved.y, this.at);
    const radius = ring.radius * unit;
    graphics.fillStyle(halo, WAVE_RING.softAlpha * ring.shown);
    strokeRound(
      graphics,
      x,
      y,
      Math.max(0, radius - WAVE_RING.softIn * unit),
      WAVE_RING.softWidth * unit,
      pixelRatio,
    );
    graphics.fillStyle(body, WAVE_RING.alpha * ring.shown);
    strokeRound(
      graphics,
      x,
      y,
      radius,
      Math.max(WAVE_RING.least, WAVE_RING.width * unit),
      pixelRatio,
    );
  }

  /** Returns the accent's energy in a palette, taken again only for a new palette. */
  private tonesFor(palette: BeltPalette): Energy {
    if (this.tones === null || palette !== this.toned) {
      this.toned = palette;
      this.tones = energyOf(palette.accent, palette);
    }
    return this.tones;
  }

  /** Strokes one of a ring's copies about a place on the field, out to a reach, in field units. */
  private stroke(
    x: number,
    y: number,
    reach: number,
    metrics: FieldMetrics,
  ): void {
    toCanvas(metrics, x, y, this.at);
    this.graphics.strokeCircle(this.at.x, this.at.y, reach * metrics.unit);
  }
}
