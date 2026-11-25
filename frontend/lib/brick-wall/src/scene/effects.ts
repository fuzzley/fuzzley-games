// What bursts from a wall game's wall as things happen on it, and what
// flashes on its field: a broken brick's shards, a ring, a streak and the
// jump line's flash, and apart from them a strip's flash, for a game that
// plays one, each made once and played in turn.

import { fadeAlpha, shareDone } from "@fz/core/math";
import { type Playing, Turns } from "@fz/core/turns";
import type { GameObjects, Scene } from "phaser";
import { COLUMNS } from "../rules/field";
import { thirdsOf } from "../rules/wall";
import { ringScale } from "../view/easing";
import {
  type FieldMetrics,
  type FieldShape,
  type Place,
  toCanvas,
} from "../view/field_metrics";
import { FLASH_MS, RING_MS, SHARDS, SHARDS_MS } from "../view/timing";
import { ATLAS, bakedScaleOf } from "./atlas";
import type { PaintContext, Painter } from "./painter";

/** How many rings may spread at once. */
export const MOST_RINGS = 8;

/** How many streaks may show at once. */
export const MOST_STREAKS = 16;

/** How many strips may flash at once. */
export const MOST_FLASHES = 4;

/**
 * How many shards may fly at once, made once: four whole rows' bricks
 * broken within a shard's flight; past it, a break throws none.
 */
export const MOST_SHARDS_FLYING = 4 * COLUMNS * SHARDS;

/** How fast a shard flies off, in field units a second, at least and at most. */
export const SHARD_SPEED = { least: 4, most: 9 } as const;

/** How fast a shard falls, in field units a second, each second. */
export const SHARD_FALL = 30;

/** How thick a flash is, the jump line's or a strip's, in field units. */
export const FLASH_THICKNESS = 0.24;

/** How opaque a flash starts, fading from there to nothing. */
export const FLASH_ALPHA = 0.8;

/** Says which of a game's frames burst from its wall, and how long a streak takes to fade. */
export interface EffectsArt {
  /** The frame of a shard, drawn in white for a tint to color as its brick. */
  readonly shard: string;
  /** The frame of a streak, along its width, the way it points. */
  readonly streak: string;
  /** The frame of a ring at its widest. */
  readonly ring: string;
  /** How long a streak takes to fade, in milliseconds. */
  readonly streakMs: number;
}

/**
 * Describes a burst from the wall, a ring or a streak, or one of a game's
 * own: an image, played from a place on the field, in field units, turned
 * on the canvas, in radians, and stretched along its length, in cells.
 */
export interface Burst extends Playing {
  readonly image: GameObjects.Image;
  angle: number;
  length: number;
}

/**
 * Describes a strip's flash: played from its middle on the field, in field
 * units, its length, in field units, its turn on the canvas, in radians,
 * its color, and the layout its strip was last sized for, null once it
 * plays anew.
 */
export interface Flash extends Playing {
  readonly strip: GameObjects.Rectangle;
  length: number;
  angle: number;
  color: number;
  sizedFor: FieldMetrics | null;
}

/** Returns a burst's record over its image, hidden until it first plays. */
export function burstOf(image: GameObjects.Image): Burst {
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
 * Returns when a kind's last burst started while it still shows, or null
 * once it is over: over by the same share of its time that hides it, so a
 * frame never lets a kind go with one still showing.
 */
export function stillShowing(
  started: number,
  now: number,
  ms: number,
): number | null {
  return shareDone(started, now, ms) < 1 ? started : null;
}

/**
 * Draws what bursts from a wall game's wall as things happen on it, and
 * what flashes on its field: a broken brick's shards, tinted as the brick
 * was, a streak, a ring and the jump line's flash. Each is made once, and
 * a scene plays them only where motion is welcome.
 *
 * A game that plays bursts of its own extends it, drawing them after it,
 * with its `burstAll()` and `placeOn()`, or `spreadAll()` for bursts that
 * spread as a ring does.
 */
export class EffectsPainter implements Painter<PaintContext<unknown>> {
  /** Throws a broken brick's shards, tinted as the brick was. */
  readonly shards: GameObjects.Particles.ParticleEmitter;
  /** A ring for each that may spread at once, each played in turn. */
  readonly rings: Turns<Burst>;
  /** A streak for each that may show at once, played in turn. */
  readonly streaks: Turns<Burst>;
  /** The flash along the jump line. */
  readonly flash: GameObjects.Rectangle;
  /** When the jump line last flashed, in the scene's time. */
  private flashedAt = Number.NEGATIVE_INFINITY;
  /** Where a burst is drawn, written for each. */
  private readonly place: Place = { x: 0, y: 0 };
  /** How much larger than baked the shards show, at the field's unit as it is laid out. */
  private shardScale = 1;
  /**
   * When the last of each kind to start started, in the scene's time, or
   * null once a frame has hidden it, so the frames when none of a kind
   * shows go through none of its pool.
   */
  private readonly lastStarted: Record<"streaks" | "rings", number | null> = {
    streaks: null,
    rings: null,
  };
  /** The shape and the layout the jump line's flash was laid along it for. */
  private flashed: {
    shape: FieldShape | null;
    metrics: FieldMetrics | null;
  } = { shape: null, metrics: null };

  constructor(
    scene: Scene,
    layer: GameObjects.Layer,
    private readonly art: EffectsArt,
  ) {
    this.flash = scene.add.rectangle(0, 0, 1, 1).setVisible(false);
    this.shards = scene.add.particles(0, 0, ATLAS, {
      frame: art.shard,
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
    this.streaks = new Turns(MOST_STREAKS, () =>
      burstOf(scene.add.image(0, 0, ATLAS, art.streak)),
    );
    this.rings = new Turns(MOST_RINGS, () =>
      burstOf(scene.add.image(0, 0, ATLAS, art.ring)),
    );
    layer.add([
      this.flash,
      ...this.streaks.all.map(({ image }) => image),
      this.shards,
      ...this.rings.all.map(({ image }) => image),
    ]);
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

  /** Spreads a ring from a place on the field, from a time. */
  ring(x: number, y: number, now: number): void {
    this.rings.play(x, y, now).image.setVisible(true);
    this.lastStarted.rings = now;
  }

  /**
   * Draws a streak through a place on the field, along the way something
   * flew, across the field and up it, from a time.
   */
  streak(x: number, y: number, dx: number, dy: number, now: number): void {
    const streak = this.streaks.play(x, y, now);
    streak.angle = Math.atan2(-dy, dx);
    streak.image.setVisible(true);
    this.lastStarted.streaks = now;
  }

  /** Flashes the jump line, from a time. */
  flashLine(now: number): void {
    this.flashedAt = now;
  }

  /**
   * Moves everything bursting and flashing on to the scene's time, and
   * hides what is over. A kind none of which shows is passed over whole,
   * and a kind that shows is read by number, as a frame's round of a pool
   * makes nothing, each of it moved on only if it shows.
   */
  draw(context: Readonly<PaintContext<unknown>>): void {
    const { now, metrics, baked } = context;
    const scale = metrics.unit / baked.unit;
    const { lastStarted } = this;
    if (lastStarted.streaks !== null) {
      const ms = this.art.streakMs;
      this.burstAll(this.streaks.all, ms, now, metrics, scale);
      lastStarted.streaks = stillShowing(lastStarted.streaks, now, ms);
    }
    if (lastStarted.rings !== null) {
      this.spreadAll(this.rings.all, RING_MS, 1, now, metrics, scale);
      lastStarted.rings = stillShowing(lastStarted.rings, now, RING_MS);
    }
    this.flashLineOn(context);
  }

  /** Moves on each of a pool of bursts that shows, read by number, as {@link burst} does. */
  protected burstAll(
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
   * Spreads each of a pool of bursts that shows from where it plays, as a
   * ring spreads, fading from an opacity through some milliseconds, and
   * hides it once it is over, read by number, as {@link burstAll} does.
   */
  protected spreadAll(
    bursts: readonly Burst[],
    ms: number,
    alpha: number,
    now: number,
    metrics: FieldMetrics,
    scale: number,
  ): void {
    const count = bursts.length;
    for (let at = 0; at < count; at++) {
      const burst = bursts[at];
      if (!burst?.image.visible) continue;
      const done = shareDone(burst.at, now, ms);
      this.placeOn(burst, metrics);
      burst.image
        .setScale(scale * ringScale(done))
        .setAlpha(alpha * fadeAlpha(done))
        .setVisible(done < 1);
    }
  }

  /** Puts a burst's image where its place on the field lies on the canvas. */
  protected placeOn(
    burst: Playing & { readonly image: GameObjects.Image },
    metrics: FieldMetrics,
  ): void {
    const { x, y } = toCanvas(metrics, burst.x, burst.y, this.place);
    burst.image.setPosition(x, y);
  }

  /**
   * Places a burst showing on the canvas, turned, scaled and stretched
   * along its length, fading through its time, and hides it once it is
   * over.
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

  /** Draws the jump line's flash fading through its time, along the line, or hides it. */
  private flashLineOn({
    now,
    shape,
    metrics,
    palette,
  }: Readonly<PaintContext<unknown>>): void {
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

/**
 * Flashes strips of a wall game's field, each in a color, such as along
 * the face of a brick a shot strikes: a strip for each that may flash at
 * once, made once and played in turn, fading through its time.
 */
export class StripFlashes implements Painter<PaintContext<unknown>> {
  /** A strip for each flash that may show at once, played in turn. */
  readonly flashes: Turns<Flash>;
  /** When the last flash to start started, in the scene's time, or null once a frame has hidden it, so the frames when none shows go through none of the pool. */
  private lastStarted: number | null = null;
  /** Where a strip is drawn, written for each. */
  private readonly place: Place = { x: 0, y: 0 };
  /** How long each flash takes to fade, in milliseconds. */
  private readonly ms: number;

  /** Makes a strip for each flash that may show at once, in a layer, each fading over `ms`: the wall games' `FLASH_MS` unless a game's flash takes its own time. */
  constructor(scene: Scene, layer: GameObjects.Layer, ms: number = FLASH_MS) {
    this.ms = ms;
    this.flashes = new Turns(MOST_FLASHES, () => ({
      strip: scene.add.rectangle(0, 0, 1, 1).setVisible(false),
      at: Number.NEGATIVE_INFINITY,
      x: 0,
      y: 0,
      length: 1,
      angle: 0,
      color: 0,
      sizedFor: null,
    }));
    layer.add(this.flashes.all.map(({ strip }) => strip));
  }

  /**
   * Flashes a strip of the field in a color, from a time: its middle at a
   * place on the field, some field units long, turned on the canvas some
   * radians.
   */
  flash(
    x: number,
    y: number,
    length: number,
    angle: number,
    color: number,
    now: number,
  ): void {
    const flash = this.flashes.play(x, y, now);
    flash.length = length;
    flash.angle = angle;
    flash.color = color;
    flash.sizedFor = null;
    flash.strip.setVisible(true);
    this.lastStarted = now;
  }

  /** Moves each strip that flashes on to the scene's time, passing over the pool while none does. */
  draw({ now, metrics }: Readonly<PaintContext<unknown>>): void {
    if (this.lastStarted === null) return;
    const flashes = this.flashes.all;
    const count = flashes.length;
    for (let at = 0; at < count; at++) {
      const flash = flashes[at];
      if (flash?.strip.visible) this.flashOn(flash, now, metrics);
    }
    this.lastStarted = stillShowing(this.lastStarted, now, this.ms);
  }

  /**
   * Draws a strip's flash fading through its time, along its length, sized
   * again only for a new layout, as sizing a strip makes its outline anew,
   * or hides it once it is over.
   */
  private flashOn(flash: Flash, now: number, metrics: FieldMetrics): void {
    const done = shareDone(flash.at, now, this.ms);
    if (flash.sizedFor !== metrics) {
      flash.sizedFor = metrics;
      const { x, y } = toCanvas(metrics, flash.x, flash.y, this.place);
      flash.strip
        .setSize(flash.length * metrics.unit, FLASH_THICKNESS * metrics.unit)
        .setPosition(x, y)
        .setRotation(flash.angle);
    }
    flash.strip
      .setFillStyle(flash.color, FLASH_ALPHA * fadeAlpha(done))
      .setVisible(done < 1);
  }
}
