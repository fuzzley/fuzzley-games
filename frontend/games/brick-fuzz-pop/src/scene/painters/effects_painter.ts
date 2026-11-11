import { fadeAlpha, shareDone } from "@fz/core/math";
import { type Playing, Turns } from "@fz/core/turns";
import type { GameObjects, Scene } from "phaser";
import { columnOf, fieldRowOf, wallRowOf } from "../../rules/grid";
import { COLUMNS, MOST_FRIENDS } from "../../rules/tuning";
import { type Wall, thirdsOf } from "../../rules/wall/wall";
import { FRAMES } from "../../view/art/frames";
import { hopHeight, ringScale } from "../../view/effects/flourish";
import {
  BOLT_MS,
  FLASH_MS,
  HOP_MS,
  RING_MS,
  SHARDS,
  SHARDS_MS,
  STREAK_MS,
} from "../../view/effects/timing";
import {
  type FieldMetrics,
  type FieldShape,
  type Place,
  toCanvas,
} from "../../view/field/field_metrics";
import { ATLAS, bakedScaleOf } from "../atlas";
import { FLIGHT_FRAMES } from "../field_art";
import { INKED } from "./ball_painter";
import type { PaintContext, Painter } from "./painter";

/** How many blasts' rings may spread at once; a chain goes off a few at a time. */
const RING_POOL = 8;

/** How many pieces of bolt may show at once: a cross zapper's on the deepest field, and as many again for a chain. */
const BOLT_POOL = 96;

/** How many punches' streaks may show at once. */
const STREAK_POOL = 16;

/**
 * How many shards may fly at once, made once: four whole rows' bricks
 * broken within a shard's flight, more than a chain of zaps breaks; past
 * it, a break throws none.
 */
export const MOST_SHARDS_FLYING = 4 * COLUMNS * SHARDS;

/** How fast a shard flies off, in field units a second, at least and at most. */
export const SHARD_SPEED = { least: 4, most: 9 } as const;

/** How fast a shard falls, in field units a second, each second. */
export const SHARD_FALL = 30;

/** How thick the jump line's flash is, in field units. */
const FLASH_THICKNESS = 0.24;

/** How opaque the jump line's flash starts, fading from there to nothing. */
export const FLASH_ALPHA = 0.8;

/**
 * Describes a burst from the wall, a ring, a piece of bolt or a streak: an
 * image, played from a place on the field, in field units, turned on the
 * canvas, in radians, and stretched along its length, in cells.
 */
export interface Burst extends Playing {
  readonly image: GameObjects.Image;
  angle: number;
  length: number;
}

/** Describes a freed friend's hop: its body and its eyes, played from its cage's middle, in field units. */
export interface Hop extends Playing {
  readonly body: GameObjects.Image;
  readonly eyes: GameObjects.Image;
}

/**
 * Returns when a kind's last burst started while it still shows, or null
 * once it is over: over by the same share of its time that hides it, so a
 * frame never lets a kind go with one still showing.
 */
function stillShowing(started: number, now: number, ms: number): number | null {
  return shareDone(started, now, ms) < 1 ? started : null;
}

/** Returns a burst's record over its image, hidden until it first plays. */
function burstOf(image: GameObjects.Image): Burst {
  return {
    image: image.setVisible(false),
    at: Number.NEGATIVE_INFINITY,
    x: 0,
    y: 0,
    angle: 0,
    length: 1,
  };
}

/**
 * Draws what bursts from the wall as things happen on it: a broken brick's
 * shards, a punch's streak, a zap's bolt, a blast's ring, a freed friend's
 * hop down to the floor and the jump line's flash.
 * Each is made once, and the scene plays them only where motion is
 * welcome.
 */
export class EffectsPainter implements Painter {
  /** Throws a broken brick's shards, tinted as the brick was. */
  readonly shards: GameObjects.Particles.ParticleEmitter;
  /** A ring for each blast that may spread at once, each played in turn. */
  readonly rings: Turns<Burst>;
  /** The pieces a zap's bolt is drawn in, a cell each, played in turn. */
  readonly bolts: Turns<Burst>;
  /** A streak for each punch that may show at once, played in turn. */
  readonly streaks: Turns<Burst>;
  /** A friend for each that may be freed at once, played in turn. */
  readonly hops: Turns<Hop>;
  /** The flash along the jump line. */
  readonly flash: GameObjects.Rectangle;
  /** When the jump line last flashed, in the scene's time. */
  private flashedAt = Number.NEGATIVE_INFINITY;
  /** Where a burst is drawn, written for each. */
  private readonly place: Place = { x: 0, y: 0 };
  /** How much larger than baked the shards show, at the field's unit as it is laid out. */
  private shardScale = 1;
  /** How far a zap's bolt runs each way from its brick, in cells, by way: across × 3 + up, each −1 to 1, plus 4. */
  private readonly reaches = new Int32Array(9);
  /**
   * When the last of each kind of burst to start started, in the scene's
   * time, or null once a frame has hidden it, so the frames when none of a
   * kind shows go through none of its pool.
   */
  private readonly lastStarted: Record<
    "streaks" | "bolts" | "rings" | "hops",
    number | null
  > = { streaks: null, bolts: null, rings: null, hops: null };
  /** The shape and the layout the flash was laid along the jump line for. */
  private flashed: {
    shape: FieldShape | null;
    metrics: FieldMetrics | null;
  } = { shape: null, metrics: null };

  constructor(
    scene: Scene,
    layers: {
      readonly bursts: GameObjects.Layer;
      readonly balls: GameObjects.Layer;
    },
  ) {
    this.flash = scene.add.rectangle(0, 0, 1, 1).setVisible(false);
    this.shards = scene.add.particles(0, 0, ATLAS, {
      frame: FLIGHT_FRAMES.shard,
      emitting: false,
      maxAliveParticles: MOST_SHARDS_FLYING,
      lifespan: SHARDS_MS,
      alpha: { start: 1, end: 0 },
      rotate: { min: 0, max: 360 },
      scale: () => this.shardScale,
      // Set for the field's unit as it is laid out; given here, as
      // `updateConfig()` changes only the keys a config already has.
      speed: { min: 0, max: 0 },
      gravityY: 0,
    });
    this.shards.reserve(MOST_SHARDS_FLYING);
    this.streaks = new Turns(STREAK_POOL, () =>
      burstOf(scene.add.image(0, 0, ATLAS, FLIGHT_FRAMES.streak)),
    );
    this.bolts = new Turns(BOLT_POOL, () =>
      burstOf(scene.add.image(0, 0, ATLAS, FLIGHT_FRAMES.bolt)),
    );
    this.rings = new Turns(RING_POOL, () =>
      burstOf(scene.add.image(0, 0, ATLAS, FLIGHT_FRAMES.ring)),
    );
    this.hops = new Turns(MOST_FRIENDS, () => ({
      body: scene.add.image(0, 0, ATLAS, FRAMES.friend(0)).setVisible(false),
      eyes: scene.add.image(0, 0, ATLAS, FRAMES.eyes).setVisible(false),
      at: Number.NEGATIVE_INFINITY,
      x: 0,
      y: 0,
    }));
    layers.bursts.add([
      this.flash,
      ...this.streaks.all.map(({ image }) => image),
      this.shards,
      ...this.bolts.all.map(({ image }) => image),
      ...this.rings.all.map(({ image }) => image),
    ]);
    layers.balls.add(this.hops.all.flatMap(({ body, eyes }) => [body, eyes]));
  }

  /** Sets how large the shards show, and how fast they fly and fall, for the field's unit. */
  layout(metrics: FieldMetrics): void {
    this.shardScale = metrics.unit / bakedScaleOf(metrics).unit;
    this.shards.updateConfig({
      speed: {
        min: SHARD_SPEED.least * metrics.unit,
        max: SHARD_SPEED.most * metrics.unit,
      },
      gravityY: SHARD_FALL * metrics.unit,
    });
  }

  /** Throws a broken brick's shards from a place on the field, in its color. */
  shatter(x: number, y: number, color: number, metrics: FieldMetrics): void {
    const { x: across, y: down } = toCanvas(metrics, x, y, this.place);
    this.shards.setParticleTint(color).explode(SHARDS, across, down);
  }

  /** Spreads a blast's ring from a place on the field, from a time. */
  ring(x: number, y: number, now: number): void {
    this.rings.play(x, y, now).image.setVisible(true);
    this.lastStarted.rings = now;
  }

  /**
   * Draws a punch's streak through a place on the field, along the way its
   * fuzzball flew, across the field and up it, from a time.
   */
  streak(x: number, y: number, dx: number, dy: number, now: number): void {
    const streak = this.streaks.play(x, y, now);
    streak.angle = Math.atan2(-dy, dx);
    streak.image.setVisible(true);
    this.lastStarted.streaks = now;
  }

  /**
   * Draws a zap's bolt from its brick's middle to the middle of the
   * furthest cell it reaches each way, a piece a cell, through cells it
   * passes over too, those in the field alone, from a time.
   */
  zap(
    wall: Wall,
    cell: number,
    reached: readonly number[],
    depth: number,
    now: number,
  ): void {
    const reaches = this.reaches.fill(0);
    const column = columnOf(cell);
    const row = wallRowOf(cell);
    for (const to of reached) {
      const across = columnOf(to) - column;
      const up = wallRowOf(to) - row;
      const way = (Math.sign(across) + 1) * 3 + Math.sign(up) + 1;
      reaches[way] = Math.max(
        reaches[way] ?? 0,
        Math.abs(across),
        Math.abs(up),
      );
    }
    const fromX = column + 0.5;
    const fromY = fieldRowOf(wall, cell) + 0.5;
    for (let way = 0; way < reaches.length; way++) {
      const across = Math.floor(way / 3) - 1;
      const up = (way % 3) - 1;
      const angle = Math.atan2(-up, across);
      const length = Math.hypot(across, up);
      const reach = reaches[way] ?? 0;
      for (let step = 0.5; step < reach; step++) {
        const y = fromY + step * up;
        if (y < 0 || y > depth) continue;
        const piece = this.bolts.play(fromX + step * across, y, now);
        piece.angle = angle;
        piece.length = length;
        piece.image.setVisible(true);
      }
    }
    this.lastStarted.bolts = now;
  }

  /** Hops a friend freed in an ink from its cage's middle on the field down to the floor, from a time. */
  hop(x: number, y: number, ink: number, now: number): void {
    const hop = this.hops.play(x, y, now);
    hop.body.setFrame(INKED[ink] ?? FRAMES.friend(0)).setVisible(true);
    hop.eyes.setVisible(true);
    this.lastStarted.hops = now;
  }

  /** Flashes the jump line, from a time. */
  flashLine(now: number): void {
    this.flashedAt = now;
  }

  /**
   * Moves everything bursting on to the scene's time, and hides what is
   * over. A kind none of which shows is passed over whole, and a kind that
   * shows is read by number, as a frame's round of a pool makes nothing,
   * each of it moved on only if it shows.
   */
  draw(context: Readonly<PaintContext>): void {
    const { now, metrics, baked } = context;
    const scale = metrics.unit / baked.unit;
    const { lastStarted } = this;
    if (lastStarted.streaks !== null) {
      this.burstAll(this.streaks.all, STREAK_MS, now, metrics, scale);
      lastStarted.streaks = stillShowing(lastStarted.streaks, now, STREAK_MS);
    }
    if (lastStarted.bolts !== null) {
      this.burstAll(this.bolts.all, BOLT_MS, now, metrics, scale);
      lastStarted.bolts = stillShowing(lastStarted.bolts, now, BOLT_MS);
    }
    if (lastStarted.rings !== null) {
      const rings = this.rings.all;
      const count = rings.length;
      for (let at = 0; at < count; at++) {
        const ring = rings[at];
        if (!ring?.image.visible) continue;
        const done = shareDone(ring.at, now, RING_MS);
        this.placeOn(ring, metrics);
        ring.image
          .setScale(scale * ringScale(done))
          .setAlpha(fadeAlpha(done))
          .setVisible(done < 1);
      }
      lastStarted.rings = stillShowing(lastStarted.rings, now, RING_MS);
    }
    if (lastStarted.hops !== null) {
      const hops = this.hops.all;
      const count = hops.length;
      for (let at = 0; at < count; at++) {
        const hop = hops[at];
        if (hop?.body.visible) this.hopOn(hop, now, metrics, scale);
      }
      lastStarted.hops = stillShowing(lastStarted.hops, now, HOP_MS);
    }
    this.flashOn(context);
  }

  /** Moves on each of a pool of streaks or pieces of bolt that shows, read by number. */
  private burstAll(
    bursts: readonly Burst[],
    ms: number,
    now: number,
    metrics: FieldMetrics,
    scale: number,
  ): void {
    const count = bursts.length;
    for (let at = 0; at < count; at++) {
      const burst = bursts[at];
      if (burst?.image.visible) this.burst(burst, ms, now, metrics, scale);
    }
  }

  /**
   * Places a streak or a piece of bolt showing on the canvas, turned,
   * scaled and stretched along its length, fading through its time, and
   * hides it once it is over.
   */
  private burst(
    burst: Burst,
    ms: number,
    now: number,
    metrics: FieldMetrics,
    scale: number,
  ): void {
    const done = shareDone(burst.at, now, ms);
    this.placeOn(burst, metrics);
    burst.image
      .setRotation(burst.angle)
      .setScale(scale * burst.length, scale)
      .setAlpha(fadeAlpha(done))
      .setVisible(done < 1);
  }

  /** Puts a burst's image where its place on the field lies on the canvas. */
  private placeOn(burst: Burst, metrics: FieldMetrics): void {
    const { x, y } = toCanvas(metrics, burst.x, burst.y, this.place);
    burst.image.setPosition(x, y);
  }

  /** Moves a freed friend hopping along its hop to the floor, and hides it once it has landed. */
  private hopOn(
    hop: Hop,
    now: number,
    metrics: FieldMetrics,
    scale: number,
  ): void {
    const done = shareDone(hop.at, now, HOP_MS);
    const { x, y } = toCanvas(
      metrics,
      hop.x,
      hopHeight(done, hop.y),
      this.place,
    );
    hop.body
      .setPosition(x, y)
      .setScale(scale)
      .setVisible(done < 1);
    hop.eyes
      .setPosition(x, y)
      .setScale(scale)
      .setVisible(done < 1);
  }

  /** Draws the jump line's flash fading through its time, along the line, or hides it. */
  private flashOn({
    now,
    shape,
    metrics,
    palette,
  }: Readonly<PaintContext>): void {
    const done = shareDone(this.flashedAt, now, FLASH_MS);
    if (done === 1) {
      this.flash.setVisible(false);
      return;
    }
    const flashed = this.flashed;
    if (shape !== flashed.shape || metrics !== flashed.metrics) {
      flashed.shape = shape;
      flashed.metrics = metrics;
      const { x, y, width, unit } = metrics;
      this.flash
        .setSize(width, FLASH_THICKNESS * unit)
        .setPosition(x + width / 2, y + thirdsOf(shape.depth).jump * unit);
    }
    this.flash
      .setFillStyle(palette.jumpLine, FLASH_ALPHA * fadeAlpha(done))
      .setVisible(true);
  }
}
