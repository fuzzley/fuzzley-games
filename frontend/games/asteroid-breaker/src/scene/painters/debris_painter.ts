import { easeOutCubic, fadeAlpha, shareDone } from "@fz/core/math";
import type { GameObjects, Scene } from "phaser";
import { type Moving, wrap } from "../../rules/torus";
import { FLOURISH, FRAMES } from "../../view/art/art";
import { SPARK_REACH } from "../../view/effects/flourish";
import { DUST_MS, SHARDS_MS, SPARK_MS } from "../../view/effects/timing";
import { type FieldMetrics, toCanvas } from "../../view/field/field_metrics";
import { ATLAS } from "../atlas";
import { Copies } from "./copies";
import type { PaintContext, Painter } from "./painter";
import { type Playing, Turns } from "./turns";

/**
 * How many puffs of dust and sparks may play at once each: a blast breaks a
 * crowd of rocks at once.
 */
const POOL = 12;

/** How fast a shard flies off, in field units a second, at least and at most. */
const SHARD_SPEED = { least: 5, most: 11 } as const;

/**
 * How many shards may fly at once: a blast's crowd of rocks' and a lost
 * ship's. Each is made as the scene starts, and one past them is left out
 * rather than made in play.
 */
export const MOST_SHARDS_FLYING = 128;

/** How opaque a puff of dust is as it starts. */
const DUST_ALPHA = 0.45;

/** Describes a puff of dust spreading from a broken rock, as far as its radius. */
interface Puff extends Playing {
  readonly copies: Copies;
  radius: number;
}

/**
 * Describes a spark flying off the edge of a rock that held a hit, from its
 * middle, out of its radius, the way it flies.
 */
interface Spark extends Playing {
  readonly copies: Copies;
  radius: number;
  wayX: number;
  wayY: number;
}

/**
 * Draws what flies off a thing as it is hit: a broken rock's shards and
 * dust, a lost ship's burst of shards and a held hit's spark. Each is made
 * once, and the scene plays them only where motion is welcome.
 */
export class DebrisPainter implements Painter {
  /** Throws the shards of a broken rock and of a lost ship, tinted as each was. */
  readonly shards: GameObjects.Particles.ParticleEmitter;
  /** The puffs of dust, each played in turn. */
  readonly puffs: Turns<Puff>;
  /** The sparks, each played in turn. */
  readonly sparks: Turns<Spark>;

  /** The field's unit and zoom as shards were last thrown at, which they fly and are sized by. */
  private unit = 0;
  private zoom = 1;
  /** Where shards are thrown from on the canvas, written as they are thrown. */
  private readonly at: Moving = { x: 0, y: 0 };

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.shards = scene.add.particles(0, 0, ATLAS, {
      frame: FRAMES.shard,
      emitting: false,
      maxAliveParticles: MOST_SHARDS_FLYING,
      lifespan: SHARDS_MS,
      alpha: { start: 1, end: 0 },
      rotate: { min: 0, max: 360 },
      speed: () =>
        this.unit *
        (SHARD_SPEED.least +
          Math.random() * (SHARD_SPEED.most - SHARD_SPEED.least)),
      scale: () => this.zoom,
    });
    this.shards.reserve(MOST_SHARDS_FLYING);
    // Built back to front, as `layers.ts` lists the effects layer's
    // flourishes: each `Copies` joins the layer as it is made.
    layer.add(this.shards);
    this.puffs = new Turns(POOL, () => ({
      copies: new Copies(scene, layer, FRAMES.puff),
      at: -Infinity,
      x: 0,
      y: 0,
      radius: 0,
    }));
    this.sparks = new Turns(POOL, () => ({
      copies: new Copies(scene, layer, FRAMES.spark),
      at: -Infinity,
      x: 0,
      y: 0,
      radius: 0,
      wayX: 0,
      wayY: 0,
    }));
  }

  /** Takes up each image's frame again, once the atlas has been baked again. */
  refresh(): void {
    for (const { copies } of [...this.puffs.all, ...this.sparks.all]) {
      copies.refresh();
    }
  }

  /**
   * Throws so many shards from a place on the field, in a color, at the
   * field's unit and zoom as it is now laid out, which a frame's events may
   * come before it is drawn at.
   */
  shatter(
    x: number,
    y: number,
    color: number,
    count: number,
    metrics: FieldMetrics,
    zoom: number,
  ): void {
    this.unit = metrics.unit;
    this.zoom = zoom;
    toCanvas(metrics, x, y, this.at);
    this.shards.setParticleTint(color).explode(count, this.at.x, this.at.y);
  }

  /** Spreads a puff of dust from a broken rock's middle, out to its radius, in a color. */
  puff(x: number, y: number, radius: number, color: number, now: number): void {
    const puff = this.puffs.play(x, y, now);
    puff.radius = radius;
    puff.copies.setTint(color);
  }

  /**
   * Flies a spark off the edge of a rock that held a hit, from its middle
   * and radius, a way, in radians, in a color.
   */
  spark(
    x: number,
    y: number,
    radius: number,
    way: number,
    color: number,
    now: number,
  ): void {
    const spark = this.sparks.play(x, y, now);
    spark.radius = radius;
    spark.wayX = Math.cos(way);
    spark.wayY = Math.sin(way);
    spark.copies.setTint(color);
  }

  /** Moves each puff and spark on to the scene's time. */
  draw(context: Readonly<PaintContext>): void {
    for (const puff of this.puffs.all) drawPuff(puff, context);
    for (const spark of this.sparks.all) drawSpark(spark, context);
  }

  /** Stops every shard, puff and spark, as a new field starts. */
  start(): void {
    this.shards.killAll();
    for (const turns of [this.puffs, this.sparks]) {
      for (const playing of turns.all) playing.at = -Infinity;
    }
  }
}

/**
 * Spreads a puff out and fades it, a share through its time, on both sides
 * of an edge it reaches across, or hides it once it is over.
 */
function drawPuff(
  puff: Puff,
  { field, metrics, zoom, now }: Readonly<PaintContext>,
): void {
  const done = shareDone(puff.at, now, DUST_MS);
  if (done === 1) {
    puff.copies.hide();
    return;
  }
  puff.copies.setScale(
    (zoom * easeOutCubic(done) * puff.radius) / FLOURISH.puff,
  );
  puff.copies.setAlpha(DUST_ALPHA * fadeAlpha(done));
  puff.copies.show(puff.x, puff.y, puff.radius, metrics, field.torus);
}

/**
 * Flies a spark out and fades it, a share through its time, wrapped onto
 * the field, or hides it once it is over.
 */
function drawSpark(
  spark: Spark,
  { field, metrics, zoom, now }: Readonly<PaintContext>,
): void {
  const done = shareDone(spark.at, now, SPARK_MS);
  if (done === 1) {
    spark.copies.hide();
    return;
  }
  const { torus } = field;
  const out = spark.radius + SPARK_REACH * easeOutCubic(done);
  spark.copies.setScale(zoom);
  spark.copies.setAlpha(fadeAlpha(done));
  spark.copies.show(
    wrap(spark.x + spark.wayX * out, torus.width),
    wrap(spark.y + spark.wayY * out, torus.height),
    FLOURISH.spark,
    metrics,
    torus,
  );
}
