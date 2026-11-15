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
import { RING_MS, STILL_MARK_MS } from "../../view/effects/timing";
import { type FieldMetrics, toCanvas } from "../../view/field/field_metrics";
import { COPY_SHARES } from "./copy_shares";
import type { PaintContext, Painter } from "./painter";
import { strokeRound } from "./rounds";

/** How many rings may show at once, sweeping out or standing still. */
const POOL = 12;

/** How opaque a ring is as it starts, and a still mark throughout. */
const RING_ALPHA = 0.9;

/** How wide a ring is drawn, in field units. */
export const RING_WIDTH = 0.25;

/** No copies past the edges, for a ring that doesn't wrap. */
const NO_COPIES: Readonly<Moving> = { x: 0, y: 0 };

/** Describes a ring: where, how far it reaches, in its color, whether it stands still, and whether it wraps. */
interface Ring extends Playing {
  reach: number;
  color: number;
  /** Whether it stands still at its reach, a mark where motion isn't welcome, rather than sweeping out. */
  still: boolean;
  /** Whether it is drawn past each edge it reaches across, or once, for the field's camera to cut off. */
  wraps: boolean;
}

/**
 * Draws the rings that sweep out, fading as they go, from a spent Shield, a
 * lost pod, a vent, a pickup let go or fading and a stray drifting in, and
 * the still marks where motion isn't welcome, at a dash's start and round
 * a spent Shield, each on both sides of an edge it reaches across but a
 * stray's, which comes in at the edge and is drawn once, as the stray is;
 * and the wave's ring, which crosses the whole field from where its last
 * rock went as the view's `cleared.ts` says, once, for the field's camera
 * to cut off at its edges, its soft outside and its line each a band, in
 * the accent's energy. The scene plays all but the marks only where
 * motion is welcome.
 */
export class RingPainter implements Painter {
  /** Every ring and mark showing, drawn again each frame. */
  readonly graphics: GameObjects.Graphics;

  private readonly rings = new Turns<Ring>(POOL, () => ({
    at: -Infinity,
    x: 0,
    y: 0,
    reach: 0,
    color: 0,
    still: false,
    wraps: true,
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

  /**
   * Sweeps a ring out from a place to a reach, in field units, in a color,
   * drawn past each edge it reaches across if it wraps, or once.
   */
  ring(
    x: number,
    y: number,
    reach: number,
    color: number,
    wraps: boolean,
    now: number,
  ): void {
    this.play(x, y, reach, color, false, wraps, now);
  }

  /** Marks a place with a ring standing still at a reach, in field units, in a color, for `STILL_MARK_MS`. */
  mark(x: number, y: number, reach: number, color: number, now: number): void {
    this.play(x, y, reach, color, true, true, now);
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
   * Draws each ring sweeping out, a share through its time, and each mark
   * standing still, on both sides of an edge it reaches across if it wraps,
   * and the wave's ring.
   */
  draw({ field, metrics, now, palette }: Readonly<PaintContext>): void {
    const graphics = this.graphics.clear();
    for (const ring of this.rings.all) {
      const done = shareDone(
        ring.at,
        now,
        ring.still ? STILL_MARK_MS : RING_MS,
      );
      if (done === 1) continue;
      const reach = ring.still ? ring.reach : ring.reach * easeOutCubic(done);
      graphics.lineStyle(
        RING_WIDTH * metrics.unit,
        ring.color,
        ring.still ? RING_ALPHA : RING_ALPHA * fadeAlpha(done),
      );
      // The stroke is centered on the circle, so half its width lies past it.
      const { x: across, y: down } = ring.wraps
        ? copyOffsets(
            ring.x,
            ring.y,
            reach + RING_WIDTH / 2,
            field.torus,
            this.offsets,
          )
        : NO_COPIES;
      for (const [acrossShare, downShare] of COPY_SHARES) {
        if (acrossShare === 1 && across === 0) continue;
        if (downShare === 1 && down === 0) continue;
        this.stroke(
          ring.x + acrossShare * across,
          ring.y + downShare * down,
          reach,
          metrics,
        );
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

  /** Plays a ring, sweeping out or standing still, in the next record of the pool. */
  private play(
    x: number,
    y: number,
    reach: number,
    color: number,
    still: boolean,
    wraps: boolean,
    now: number,
  ): void {
    const ring = this.rings.play(x, y, now);
    ring.reach = reach;
    ring.color = color;
    ring.still = still;
    ring.wraps = wraps;
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
