import { type Playing, Turns } from "@fz/core/turns";
import type { GameObjects, Scene } from "phaser";
import { type Moving, type Place, copyOffsets, wrap } from "../../rules/torus";
import { ZAP_ARCS } from "../../rules/tuning";
import {
  ARC_SPARK,
  ARC_SPARK_FRAME,
  type Arc,
  type ArcEnds,
  type ArcLine,
  BRANCH_WEIGHT,
  HULL_ARC_CORE,
  HULL_STROKES,
  ZAP_STROKES,
  type ZapStrike,
  arcShift,
  arcSparkHalo,
  arcSparkScale,
  arcSparkTurn,
  arcWidth,
  createArc,
  createHullArcs,
  createZapStrike,
  hullArcInk,
  hullArcSeed,
  hullArcs,
  strikeOf,
  zapAlpha,
  zapArc,
  zapEnds,
  zapLeap,
  zapStrength,
} from "../../view/art/arcs";
import { type Energy, type WrittenHalo, energyOf } from "../../view/art/energy";
import { POD_REACH } from "../../view/art/pod_art";
import type { BeltPalette } from "../../view/colors/palette";
import { type FieldMetrics, toCanvas } from "../../view/field/field_metrics";
import type { FieldEvent, FieldView } from "../../view/field/frame";
import { Copies } from "./copies";
import { type HaloPainter, dressHalo } from "./halo_painter";
import type { PaintContext, Painter } from "./painter";

/**
 * Describes a slot of a zap's arc to a rock, played from the rock's place
 * at the scene's time it struck, in milliseconds, with the arc as it struck
 * and the spark where it lands over its glow.
 */
interface ZapSlot extends Playing {
  readonly strike: ZapStrike;
  readonly spark: Copies;
  readonly glow: Copies;
}

/**
 * Draws static's arcs, over the flourishes, as the view's `arcs.ts` says:
 * each of the zap's, from the hull's edge where the pod is drawn to just
 * inside the rim of each rock it struck, leaping anew every few frames
 * where motion is welcome and fading, a spark where it lands over a soft
 * glow, so the glow lights the rock it lands on; and, at full static, the
 * arcs crawling over the hull, turned as the pod is, crawling anew where
 * motion is welcome. Each is stroked again past an edge it reaches across.
 */
export class ArcPainter implements Painter {
  /** The arcs, stroked again each frame. */
  readonly lines: GameObjects.Graphics;
  /** The glow about the spark where each of the zap's arcs lands, one for each slot. */
  readonly glows: readonly Copies[];
  /** The spark where each of the zap's arcs lands, one for each slot. */
  readonly sparks: readonly Copies[];

  /** Each zap's arc heard of, as many as a zap leaps to, the oldest's slot taken by the next. */
  private readonly zaps: Turns<ZapSlot>;
  /** The arc being stroked, written for each. */
  private readonly arc: Arc = createArc();
  /** Where the arc being stroked runs, written for each. */
  private readonly ends: ArcEnds = {
    from: { x: 0, y: 0 },
    to: { x: 0, y: 0 },
  };
  /** The arcs crawling over the hull, written each frame they show. */
  private readonly hull: readonly ArcLine[] = createHullArcs();
  /** How far off the copies of what is being stroked lie, written for each. */
  private readonly shift: Moving = { x: 0, y: 0 };
  /** A place on the canvas, written for each place stroked. */
  private readonly point: Moving = { x: 0, y: 0 };
  /** Where the spark being drawn lands, on the field, written for each. */
  private readonly landed: Moving = { x: 0, y: 0 };
  /** The glow of the spark being drawn, written for each. */
  private readonly halo: WrittenHalo = {
    along: 0,
    across: 0,
    ahead: 0,
    turn: 0,
    strength: 0,
  };
  /** The palette the zap's tones were last taken in. */
  private painted: BeltPalette | null = null;
  /** The tones of the accent's energy the zap's arcs are stroked in, taken in the palette last painted. */
  private tones: Energy = { hot: 0, body: 0, halo: 0 };

  /**
   * Makes the arcs' lines and, for each of a zap's arcs, the spark where it
   * lands over its glow, an image of the halo painter's soft disc.
   */
  constructor(scene: Scene, layer: GameObjects.Layer, halos: HaloPainter) {
    this.lines = scene.add.graphics();
    layer.add(this.lines);
    this.zaps = new Turns<ZapSlot>(ZAP_ARCS, () => ({
      at: -Infinity,
      x: 0,
      y: 0,
      strike: createZapStrike(),
      glow: halos.discIn(layer),
      spark: new Copies(scene, layer, ARC_SPARK_FRAME),
    }));
    this.glows = this.zaps.all.map(({ glow }) => glow);
    this.sparks = this.zaps.all.map(({ spark }) => spark);
  }

  /**
   * Notes a zap's arc to a rock on the field as the scene plays its event,
   * at the scene's time, in the oldest slot, its every leap cut as it
   * strikes, whether or not motion is welcome.
   */
  hear(
    event: Readonly<FieldEvent>,
    now: number,
    field: Pick<FieldView, "rocks" | "torus">,
  ): void {
    if (event.kind !== "arced") return;
    const zap = this.zaps.play(event.x, event.y, now);
    strikeOf(event, field, zap.strike);
  }

  /** Forgets the last field's arcs, as a new field starts. */
  start(): void {
    for (const zap of this.zaps.all) zap.at = -Infinity;
  }

  /** Draws each of the zap's arcs that still shows, and those crawling over the hull at full static. */
  draw(context: Readonly<PaintContext>): void {
    const { palette } = context;
    if (palette !== this.painted) {
      this.painted = palette;
      this.tones = energyOf(palette.accent, palette);
    }
    this.lines.clear();
    for (const zap of this.zaps.all) this.drawZap(zap, context);
    this.drawHull(context);
  }

  /**
   * Draws a slot's zap's arc, as strongly as it still shows, from where the
   * pod is drawn, or where it zapped from while none is, with its spark and
   * glow where it lands; or hides them once it no longer shows.
   */
  private drawZap(zap: ZapSlot, context: Readonly<PaintContext>): void {
    const { field, shipDrawn, metrics, palette, zoom, now, motion } = context;
    const since = now - zap.at;
    const strength = zapStrength(since);
    const { strike, spark, glow } = zap;
    const pod: Readonly<Place> = shipDrawn ?? strike.pod;
    const { torus } = field;
    if (
      strength <= 0 ||
      !zapEnds(pod, strike.rock, strike.rim, torus, this.ends)
    ) {
      spark.hide();
      glow.hide();
      return;
    }
    const leap = zapLeap(since, motion);
    zapArc(strike, leap, this.ends, this.arc);
    arcShift(this.arc, torus, this.shift);
    for (const stroke of ZAP_STROKES) {
      const color = this.tones[stroke.tone];
      const alpha = zapAlpha(stroke, strength, palette);
      this.lines.lineStyle(arcWidth(stroke, 1, metrics), color, alpha);
      this.strokeEach(this.arc.main, metrics);
      this.lines.lineStyle(
        arcWidth(stroke, BRANCH_WEIGHT, metrics),
        color,
        alpha,
      );
      let branches = this.arc.branchCount;
      for (const branch of this.arc.branches) {
        if (branches-- === 0) break;
        this.strokeEach(branch, metrics);
      }
    }
    const { landed, halo } = this;
    landed.x = wrap(this.ends.to.x, torus.width);
    landed.y = wrap(this.ends.to.y, torus.height);
    arcSparkHalo(leap, strength, halo);
    dressHalo(glow, halo, palette.accent, halo.turn, context);
    glow.show(landed.x, landed.y, halo.along, metrics, torus);
    spark.setScale(zoom * arcSparkScale(leap));
    spark.setRotation(arcSparkTurn(leap));
    spark.setAlpha(strength);
    spark.show(landed.x, landed.y, ARC_SPARK.reach, metrics, torus);
  }

  /**
   * Draws the arcs crawling over the hull where the pod is drawn, turned as
   * it is, in the pilot's ink under a white core, at full static with a
   * pilot at the controls.
   */
  private drawHull(context: Readonly<PaintContext>): void {
    const { field, shipDrawn, metrics, palette, now, motion } = context;
    const ink = hullArcInk(field, palette);
    if (!shipDrawn || ink === null) return;
    const count = hullArcs(
      hullArcSeed(now, motion),
      metrics,
      shipDrawn,
      this.hull,
    );
    copyOffsets(shipDrawn.x, shipDrawn.y, POD_REACH, field.torus, this.shift);
    for (const stroke of HULL_STROKES) {
      this.lines.lineStyle(
        arcWidth(stroke, 1, metrics),
        stroke.tone === "ink" ? ink : HULL_ARC_CORE,
        stroke.alpha,
      );
      let lines = count;
      for (const line of this.hull) {
        if (lines-- === 0) break;
        this.strokeEach(line, metrics);
      }
    }
  }

  /** Strokes a line on the field, in the style last set, and again past each edge it reaches across, as the shift written for it says. */
  private strokeEach(line: ArcLine, metrics: FieldMetrics): void {
    const { x, y } = this.shift;
    this.strokeLine(line, 0, 0, metrics);
    if (x !== 0) this.strokeLine(line, x, 0, metrics);
    if (y !== 0) this.strokeLine(line, 0, y, metrics);
    if (x !== 0 && y !== 0) this.strokeLine(line, x, y, metrics);
  }

  /** Strokes a line on the field, moved by an offset, in one path. */
  private strokeLine(
    line: ArcLine,
    offsetX: number,
    offsetY: number,
    metrics: FieldMetrics,
  ): void {
    const { lines, point } = this;
    lines.beginPath();
    let places = 0;
    for (const at of line.at) {
      if (places === line.count) break;
      toCanvas(metrics, at.x + offsetX, at.y + offsetY, point);
      if (places === 0) lines.moveTo(point.x, point.y);
      else lines.lineTo(point.x, point.y);
      places += 1;
    }
    lines.strokePath();
  }
}
