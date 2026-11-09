import { fadeAlpha, shareDone } from "@fz/core/math";
import { type Playing, Turns } from "@fz/core/turns";
import type { GameObjects, Scene } from "phaser";
import { MAX_BALLS } from "../../rules/tuning";
import { FRAMES, facedBallFrame } from "../../view/art/art";
import { ringScale } from "../../view/effects/flourish";
import {
  FADE_MS,
  RING_MS,
  SHAKE_INTENSITY,
  SHAKE_MS,
  SHARDS,
  SHARDS_MS,
} from "../../view/effects/timing";
import {
  type FieldMetrics,
  toCanvasX,
  toCanvasY,
} from "../../view/field/field_metrics";
import { ATLAS } from "../atlas";
import type { PaintContext, Painter } from "./painter";

/** How many blasts' rings may spread at once; a chain goes off a few at a time. */
const RING_POOL = 8;

/** How fast a shard flies off, in field units a second, at least and at most. */
const SHARD_SPEED = { least: 4, most: 9 } as const;

/** How fast a shard falls, in field units a second, each second. */
const SHARD_FALL = 30;

/** Describes a blast's ring or a lost ball's fade: an image, played from where it began. */
export interface Burst extends Playing {
  readonly image: GameObjects.Image;
}

/**
 * Returns a ring's or a fade's record over its image, hidden until it first
 * plays; its place on the field is written as it plays but never read, as
 * the image keeps its place on the canvas.
 */
function burstOf(image: GameObjects.Image): Burst {
  return { image: image.setVisible(false), at: -Infinity, x: 0, y: 0 };
}

/**
 * Draws what bursts from the field as things happen on it: a broken brick's
 * shards, a blast's ring, a lost ball's fade, and the field's shake. Each is
 * made once, and the scene plays them only where motion is welcome.
 */
export class EffectsPainter implements Painter {
  /** Throws a broken brick's shards, tinted as the brick was. */
  readonly shards: GameObjects.Particles.ParticleEmitter;
  /** A ring for each blast that may spread at once, each played in turn. */
  readonly rings: Turns<Burst>;
  /** A fading ball for each ball that may be lost at once, each played in turn. */
  readonly fades: Turns<Burst>;

  constructor(
    private readonly scene: Scene,
    bursts: GameObjects.Layer,
    balls: GameObjects.Layer,
  ) {
    this.shards = scene.add.particles(0, 0, ATLAS, {
      frame: FRAMES.shard,
      emitting: false,
      lifespan: SHARDS_MS,
      alpha: { start: 1, end: 0 },
      rotate: { min: 0, max: 360 },
      // Set for the field's unit as it is laid out; given here, as
      // `updateConfig()` changes only the keys a config already has.
      speed: { min: 0, max: 0 },
      gravityY: 0,
    });
    this.rings = new Turns(RING_POOL, () =>
      burstOf(scene.add.image(0, 0, ATLAS, FRAMES.ring)),
    );
    this.fades = new Turns(MAX_BALLS, () =>
      burstOf(scene.add.image(0, 0, ATLAS, facedBallFrame("normal"))),
    );
    bursts.add([this.shards, ...this.rings.all.map(({ image }) => image)]);
    balls.add(this.fades.all.map(({ image }) => image));
  }

  /** Sets how fast the shards fly and fall for the field's unit. */
  layout(metrics: FieldMetrics): void {
    this.shards.updateConfig({
      speed: {
        min: SHARD_SPEED.least * metrics.unit,
        max: SHARD_SPEED.most * metrics.unit,
      },
      gravityY: SHARD_FALL * metrics.unit,
    });
  }

  /** Throws a broken brick's shards from its middle, in its color. */
  shatter(x: number, y: number, color: number, metrics: FieldMetrics): void {
    this.shards
      .setParticleTint(color)
      .explode(SHARDS, toCanvasX(metrics, x), toCanvasY(metrics, y));
  }

  /** Spreads a blast's ring from where it went off. */
  ring(x: number, y: number, now: number, metrics: FieldMetrics): void {
    this.rings
      .play(x, y, now)
      .image.setPosition(toCanvasX(metrics, x), toCanvasY(metrics, y))
      .setScale(ringScale(0))
      .setAlpha(1)
      .setVisible(true);
  }

  /** Shakes the field. */
  shake(): void {
    this.scene.cameras.main.shake(SHAKE_MS, SHAKE_INTENSITY);
  }

  /** Fades a lost ball out where it fell, in its frame. */
  fade(
    x: number,
    y: number,
    frame: string,
    now: number,
    metrics: FieldMetrics,
  ): void {
    this.fades
      .play(x, y, now)
      .image.setFrame(frame)
      .setPosition(toCanvasX(metrics, x), toCanvasY(metrics, y))
      .setAlpha(1)
      .setVisible(true);
  }

  /** Moves each ring and fade on to the scene's time, and hides those that are over. */
  draw({ now }: Readonly<PaintContext>): void {
    for (const { image: ring, at } of this.rings.all) {
      if (!ring.visible) continue;
      const done = shareDone(at, now, RING_MS);
      ring.setScale(ringScale(done)).setAlpha(fadeAlpha(done));
      if (done === 1) ring.setVisible(false);
    }
    for (const { image: fade, at } of this.fades.all) {
      if (!fade.visible) continue;
      const done = shareDone(at, now, FADE_MS);
      fade.setAlpha(fadeAlpha(done));
      if (done === 1) fade.setVisible(false);
    }
  }

  /** Stops everything bursting, as a new field starts. */
  reset(): void {
    this.shards.killAll();
    for (const { image } of this.rings.all) image.setVisible(false);
    for (const { image } of this.fades.all) image.setVisible(false);
    this.scene.cameras.main.resetFX();
  }
}
