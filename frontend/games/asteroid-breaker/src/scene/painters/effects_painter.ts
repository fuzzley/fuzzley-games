import type { Cameras, GameObjects, Scene } from "phaser";
import { thrustOf } from "../../rules/ship/ship";
import { stepsIn } from "../../rules/stepper";
import { type Moving, type Torus, copyShift, wrap } from "../../rules/torus";
import { STEP_S } from "../../rules/tuning";
import { FLOURISH, FRAMES } from "../../view/art/art";
import { SHIP_FRAMES, SHIP_REACH, flameTip } from "../../view/art/ship_art";
import {
  SPARK_REACH,
  fadeAlpha,
  kickShare,
  shakeOf,
  shareDone,
  spread,
  trailAlpha,
  trailLaidAfter,
  trailReach,
} from "../../view/effects/flourish";
import {
  DASH_TRAIL,
  DUST_MS,
  KICK_CSS_PX,
  KICK_MS,
  RING_MS,
  SHAKE_CSS_PX,
  SHARDS_MS,
  SPARK_MS,
  TRAIL_MS,
} from "../../view/effects/timing";
import { type FieldMetrics, toCanvas } from "../../view/field/field_metrics";
import { angleBetween, betweenOnAxis } from "../../view/field/frame";
import { ATLAS } from "../atlas";
import { Copies } from "./copies";
import type { PaintContext, Painter } from "./painter";
import { Turns } from "./turns";

/** How many puffs of dust, sparks and rings may play at once each: a blast breaks a crowd of rocks at once. */
const POOL = 12;

/** How fast a shard flies off, in field units a second, at least and at most. */
const SHARD_SPEED = { least: 5, most: 11 } as const;

/**
 * How many shards may fly at once: a blast's crowd of rocks' and a lost
 * ship's. Each is made as the scene starts, and one past them is left out
 * rather than made in play.
 */
export const MOST_SHARDS_FLYING = 128;

/** How many exhaust specks may stream at once, more than the flame streams over a speck's life. */
export const MOST_EXHAUST = 16;

/** How many exhaust specks the flame streams a second at full thrust. */
const EXHAUST_RATE = 40;

/** How fast an exhaust speck streams back from the flame, in field units a second. */
const EXHAUST_SPEED = 6;

/** How far either side of straight back an exhaust speck may stream, in degrees. */
const EXHAUST_SPREAD = 18;

/** How long an exhaust speck lasts as it fades, in milliseconds. */
export const EXHAUST_MS = 300;

/** How large an exhaust speck is, a share of the puff it is drawn from. */
const EXHAUST_SIZE = 0.4;

/** How opaque a puff of dust is as it starts. */
const DUST_ALPHA = 0.45;

/** How opaque a ring is as it starts. */
const RING_ALPHA = 0.9;

/** How wide a ring is drawn, in field units. */
const RING_WIDTH = 0.25;

/** Describes a flourish that plays from a place on the field, from a time. */
interface Playing {
  /** When it started, in the scene's time, or −Infinity before it first plays. */
  at: number;
  x: number;
  y: number;
}

/** Describes a puff of dust spreading from a broken rock, as far as its radius. */
interface Puff extends Playing {
  readonly copies: Copies;
  radius: number;
}

/** Describes a spark flying off the edge of a rock that held a hit, from its middle, out of its radius, the way it flies. */
interface Spark extends Playing {
  readonly copies: Copies;
  radius: number;
  wayX: number;
  wayY: number;
}

/** Describes a ring sweeping out to its reach, in its color. */
interface Ring extends Playing {
  reach: number;
  color: number;
}

/** Describes a dash's trail, laid from where it started the way it went, a share along each axis. */
interface Trail {
  x: number;
  y: number;
  wayX: number;
  wayY: number;
  /** The field's step as the dash started, which its outlines are laid on from, or Infinity for none. */
  fromStep: number;
  /** When each of its outlines was laid, in the scene's time, or −Infinity for one not yet laid. */
  readonly laidAt: number[];
}

/** Describes the field's kick, the way the blow came, a share along each axis, from a time. */
interface Kick {
  at: number;
  wayX: number;
  wayY: number;
}

/**
 * Draws what bursts from the field as things happen on it: a broken rock's
 * shards and dust, a lost ship's burst, a held hit's spark, the rings, a
 * dash's trail and the exhaust off the flame; and kicks and shakes the
 * field, through its camera's scroll. Each is made once, and the scene
 * plays them only where motion is welcome.
 */
export class EffectsPainter implements Painter {
  /** Throws the shards of a broken rock and of a lost ship, tinted as each was. */
  readonly shards: GameObjects.Particles.ParticleEmitter;
  /** Streams the exhaust off the flame. */
  readonly exhaust: GameObjects.Particles.ParticleEmitter;
  /** The puffs of dust, each played in turn. */
  readonly puffs: Turns<Puff>;
  /** The sparks, each played in turn. */
  readonly sparks: Turns<Spark>;
  /** Every ring sweeping out, drawn again each frame. */
  readonly rings: GameObjects.Graphics;
  /** A dash's outlines, counting from where it started. */
  readonly trail: readonly Copies[];

  private readonly ringTurns = new Turns<Ring>(POOL, () => ({
    at: -Infinity,
    x: 0,
    y: 0,
    reach: 0,
    color: 0,
  }));
  private readonly dash: Trail = {
    x: 0,
    y: 0,
    wayX: 0,
    wayY: 0,
    fromStep: Infinity,
    laidAt: Array.from({ length: DASH_TRAIL }, () => -Infinity),
  };
  private readonly kicked: Kick = { at: -Infinity, wayX: 0, wayY: 0 };
  /** When the last ship was lost, which the field shakes from. */
  private lostAt = -Infinity;
  /** The field's unit and zoom as last drawn or shattered at, which the particles fly and are sized by. */
  private unit = 0;
  private zoom = 1;
  /** The way the exhaust streams, in degrees, straight back from the flame. */
  private exhaustAngle = 0;
  /** The share of an exhaust speck due but not yet streamed, carried to the next frame. */
  private exhaustDue = 0;
  /** The field's steps as it was last drawn, or null before a field is first drawn. */
  private stepsDrawn: number | null = null;

  /** Where a thing is on the field, written each frame. */
  private readonly place: Moving = { x: 0, y: 0 };
  /** Where it is on the canvas, written each frame. */
  private readonly at: Moving = { x: 0, y: 0 };
  /** How far the field is shaken, written each frame. */
  private readonly shaken: Moving = { x: 0, y: 0 };

  constructor(
    scene: Scene,
    layer: GameObjects.Layer,
    private readonly camera: Cameras.Scene2D.Camera,
  ) {
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
    this.exhaust = scene.add.particles(0, 0, ATLAS, {
      frame: FRAMES.puff,
      emitting: false,
      maxAliveParticles: MOST_EXHAUST,
      lifespan: EXHAUST_MS,
      alpha: { start: 0.8, end: 0 },
      angle: () => this.exhaustAngle + (Math.random() * 2 - 1) * EXHAUST_SPREAD,
      speed: () => this.unit * EXHAUST_SPEED,
      scale: () => this.zoom * EXHAUST_SIZE,
    });
    this.exhaust.reserve(MOST_EXHAUST);
    // Built back to front, as `layers.ts` lists the effects layer's
    // flourishes: each `Copies` joins the layer as it is made.
    this.trail = Array.from(
      { length: DASH_TRAIL },
      () => new Copies(scene, layer, SHIP_FRAMES.ship),
    );
    layer.add([this.exhaust, this.shards]);
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
    this.rings = scene.add.graphics();
    layer.add(this.rings);
  }

  /** Takes up each image's frame again, once the atlas has been baked again. */
  refresh(): void {
    for (const { copies } of [...this.puffs.all, ...this.sparks.all]) {
      copies.refresh();
    }
    for (const outline of this.trail) outline.refresh();
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
    this.place.x = x;
    this.place.y = y;
    toCanvas(metrics, this.place, this.at);
    this.shards.setParticleTint(color).explode(count, this.at.x, this.at.y);
  }

  /** Spreads a puff of dust from a broken rock's middle, out to its radius, in its ink. */
  puff(x: number, y: number, radius: number, color: number, now: number): void {
    const puff = this.puffs.take();
    play(puff, x, y, now);
    puff.radius = radius;
    puff.copies.setTint(color);
  }

  /** Flies a spark off the edge of a rock that held a hit, from its middle and radius, a way, in radians, in a color. */
  spark(
    x: number,
    y: number,
    radius: number,
    way: number,
    color: number,
    now: number,
  ): void {
    const spark = this.sparks.take();
    play(spark, x, y, now);
    spark.radius = radius;
    spark.wayX = Math.cos(way);
    spark.wayY = Math.sin(way);
    spark.copies.setTint(color);
  }

  /** Sweeps a ring out from a place to a reach, in field units, in a color. */
  ring(x: number, y: number, reach: number, color: number, now: number): void {
    const ring = this.ringTurns.take();
    play(ring, x, y, now);
    ring.reach = reach;
    ring.color = color;
  }

  /**
   * Lays a dash's trail from where it started, the way it went, a share
   * along each axis, its outlines laid as the field steps on from the step
   * given, so a field that stops lays none ahead of its ship.
   */
  trailDash(
    x: number,
    y: number,
    wayX: number,
    wayY: number,
    fromStep: number,
  ): void {
    const { dash } = this;
    dash.x = x;
    dash.y = y;
    dash.wayX = wayX;
    dash.wayY = wayY;
    dash.fromStep = fromStep;
    dash.laidAt.fill(-Infinity);
  }

  /** Kicks the field the way a blow came, a share along each axis. */
  kick(wayX: number, wayY: number, now: number): void {
    this.kicked.at = now;
    this.kicked.wayX = wayX;
    this.kicked.wayY = wayY;
  }

  /** Shakes the field, from a ship lost, after a moment's pause. */
  shake(now: number): void {
    this.lostAt = now;
  }

  /** Moves each flourish on to the scene's time, streams the exhaust and kicks and shakes the field as they say. */
  draw(context: Readonly<PaintContext>): void {
    const { field, metrics, zoom, now } = context;
    this.unit = metrics.unit;
    this.zoom = zoom;
    // The exhaust and the trail follow the field's steps, which stop as it
    // pauses or is cleared, though the scene's time runs on.
    const stepped = field.steps - (this.stepsDrawn ?? field.steps);
    this.stepsDrawn = field.steps;
    this.stream(context, stepped);
    for (const puff of this.puffs.all) this.drawPuff(puff, context);
    for (const spark of this.sparks.all) this.drawSpark(spark, context);
    this.drawRings(now, metrics, field.torus);
    this.drawTrail(context);
    this.moveCamera(now, metrics);
  }

  /** Stops every flourish, as a new field starts. */
  reset(): void {
    this.shards.killAll();
    this.exhaust.killAll();
    for (const turns of [this.puffs, this.sparks, this.ringTurns]) {
      for (const playing of turns.all) playing.at = -Infinity;
    }
    this.dash.fromStep = Infinity;
    this.dash.laidAt.fill(-Infinity);
    this.kicked.at = -Infinity;
    this.lostAt = -Infinity;
    this.exhaustDue = 0;
    this.stepsDrawn = null;
  }

  /**
   * Streams exhaust off the flame's tip, wrapped onto the field, for the
   * steps the field took since it was last drawn, as many specks as the
   * thrust is strong.
   */
  private stream(
    { field, alpha, metrics, palette, motion }: Readonly<PaintContext>,
    stepped: number,
  ): void {
    const { ship, torus } = field;
    const thrust = ship && motion ? thrustOf(ship) : 0;
    if (!ship || thrust === 0) {
      this.exhaustDue = 0;
      return;
    }
    const x = betweenOnAxis(ship.lastX, ship.x, alpha, torus.width);
    const y = betweenOnAxis(ship.lastY, ship.y, alpha, torus.height);
    const angle = angleBetween(ship.lastAngle, ship.angle, alpha);
    const behind = flameTip(thrust);
    this.place.x = wrap(x - Math.cos(angle) * behind, torus.width);
    this.place.y = wrap(y - Math.sin(angle) * behind, torus.height);
    toCanvas(metrics, this.place, this.at);
    this.exhaustAngle = (angle * 180) / Math.PI + 180;
    this.exhaustDue += thrust * EXHAUST_RATE * stepped * STEP_S;
    const streamed = Math.floor(this.exhaustDue);
    this.exhaustDue -= streamed;
    if (streamed > 0) {
      this.exhaust
        .setParticleTint(palette.flame)
        .emitParticleAt(this.at.x, this.at.y, streamed);
    }
  }

  /** Spreads a puff out and fades it, a share through its time, on both sides of an edge it reaches across, or hides it once it is over. */
  private drawPuff(
    puff: Puff,
    { field, metrics, zoom, now }: Readonly<PaintContext>,
  ): void {
    const done = shareDone(puff.at, now, DUST_MS);
    if (done === 1) {
      puff.copies.hide();
      return;
    }
    puff.copies.setScale((zoom * spread(done) * puff.radius) / FLOURISH.puff);
    puff.copies.setAlpha(DUST_ALPHA * fadeAlpha(done));
    puff.copies.show(puff.x, puff.y, puff.radius, metrics, field.torus);
  }

  /** Flies a spark out and fades it, a share through its time, wrapped onto the field, or hides it once it is over. */
  private drawSpark(
    spark: Spark,
    { field, metrics, zoom, now }: Readonly<PaintContext>,
  ): void {
    const done = shareDone(spark.at, now, SPARK_MS);
    if (done === 1) {
      spark.copies.hide();
      return;
    }
    const { torus } = field;
    const out = spark.radius + SPARK_REACH * spread(done);
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

  /** Draws each ring sweeping out, on both sides of an edge it reaches across. */
  private drawRings(now: number, metrics: FieldMetrics, torus: Torus): void {
    const graphics = this.rings.clear();
    for (const ring of this.ringTurns.all) {
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
      this.strokeRing(ring.x, ring.y, reach, metrics);
      if (across !== 0) {
        this.strokeRing(ring.x + across, ring.y, reach, metrics);
      }
      if (down !== 0) {
        this.strokeRing(ring.x, ring.y + down, reach, metrics);
      }
      if (across !== 0 && down !== 0) {
        this.strokeRing(ring.x + across, ring.y + down, reach, metrics);
      }
    }
  }

  /** Strokes one of a ring's copies about a place on the field, out to a reach, in field units. */
  private strokeRing(
    x: number,
    y: number,
    reach: number,
    metrics: FieldMetrics,
  ): void {
    this.place.x = x;
    this.place.y = y;
    toCanvas(metrics, this.place, this.at);
    this.rings.strokeCircle(this.at.x, this.at.y, reach * metrics.unit);
  }

  /** Lays each of a dash's outlines once the field has stepped the ship past where it lies, and fades it. */
  private drawTrail({
    field,
    metrics,
    zoom,
    now,
  }: Readonly<PaintContext>): void {
    const { dash } = this;
    const { torus } = field;
    const heading = Math.atan2(dash.wayY, dash.wayX);
    for (let i = 0; i < this.trail.length; i++) {
      const outline = this.trail[i];
      if (!outline) continue;
      const passed = field.steps - dash.fromStep >= stepsIn(trailLaidAfter(i));
      if (dash.laidAt[i] === -Infinity && passed) dash.laidAt[i] = now;
      const done = shareDone(dash.laidAt[i] ?? -Infinity, now, TRAIL_MS);
      if (done === 1) {
        outline.hide();
        continue;
      }
      const reach = trailReach(i);
      outline.setRotation(heading);
      outline.setScale(zoom);
      outline.setAlpha(trailAlpha(i) * fadeAlpha(done));
      outline.show(
        wrap(dash.x + dash.wayX * reach, torus.width),
        wrap(dash.y + dash.wayY * reach, torus.height),
        SHIP_REACH,
        metrics,
        torus,
      );
    }
  }

  /** Scrolls the field's camera from where it rests by its kick and its shake. */
  private moveCamera(now: number, metrics: FieldMetrics): void {
    const { kicked, shaken } = this;
    const kick =
      KICK_CSS_PX *
      metrics.pixelRatio *
      kickShare(shareDone(kicked.at, now, KICK_MS));
    shakeOf(now - this.lostAt, shaken);
    const shake = SHAKE_CSS_PX * metrics.pixelRatio;
    // The field moves the way the blow came, so its camera the other.
    this.camera.setScroll(
      metrics.x - kicked.wayX * kick + shaken.x * shake,
      metrics.y - kicked.wayY * kick + shaken.y * shake,
    );
  }
}

/** Starts a flourish playing from a place, at a time. */
function play(playing: Playing, x: number, y: number, now: number): void {
  playing.at = now;
  playing.x = x;
  playing.y = y;
}
