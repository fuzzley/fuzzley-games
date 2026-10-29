import type { GameObjects, Scene } from "phaser";
import { MAX_BALLS } from "../rules/tuning";
import { FRAMES, ballFrame } from "../view/art";
import { type FieldMetrics, toCanvasX, toCanvasY } from "../view/field_metrics";
import { fadeAlpha, ringScale, shareDone } from "../view/flourish";
import {
  FADE_MS,
  RING_MS,
  SHAKE_INTENSITY,
  SHAKE_MS,
  SHARDS,
  SHARDS_MS,
} from "../view/timing";
import { ATLAS } from "./atlas";

/** How many blasts' rings may spread at once; a chain goes off a few at a time. */
const RING_POOL = 8;

/** How fast a shard flies off, in field units a second, at least and at most. */
const SHARD_SPEED = { least: 4, most: 9 } as const;

/** How fast a shard falls, in field units a second, each second. */
const SHARD_FALL = 30;

/**
 * Draws what bursts from the field as things happen on it: a broken brick's
 * shards, a blast's ring, a lost ball's fade, and the field's shake. Each is
 * made once, and the scene plays them only where motion is welcome.
 */
export class EffectsPainter {
  /** Throws a broken brick's shards, tinted as the brick was. */
  readonly shards: GameObjects.Particles.ParticleEmitter;
  /** A ring for each blast that may spread at once. */
  readonly rings: readonly GameObjects.Image[];
  /** A fading ball for each ball that may be lost at once. */
  readonly fades: readonly GameObjects.Image[];

  /** When each ring started to spread, in the scene's time. */
  private readonly ringsAt: number[];
  /** When each ball started to fade. */
  private readonly fadesAt: number[];
  private nextRing = 0;
  private nextFade = 0;

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
    });
    this.rings = Array.from({ length: RING_POOL }, () =>
      scene.add.image(0, 0, ATLAS, FRAMES.ring).setVisible(false),
    );
    this.fades = Array.from({ length: MAX_BALLS }, () =>
      scene.add.image(0, 0, ATLAS, ballFrame("normal")).setVisible(false),
    );
    this.ringsAt = this.rings.map(() => 0);
    this.fadesAt = this.fades.map(() => 0);
    bursts.add([this.shards, ...this.rings]);
    balls.add([...this.fades]);
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

  /** Takes up each image's frame again, once the atlas has been baked again. */
  refresh(): void {
    for (const ring of this.rings) ring.setFrame(FRAMES.ring);
    for (const fade of this.fades) fade.setFrame(fade.frame.name);
  }

  /** Throws a broken brick's shards from its middle, in its color. */
  shatter(x: number, y: number, color: number, metrics: FieldMetrics): void {
    this.shards
      .setParticleTint(color)
      .explode(SHARDS, toCanvasX(metrics, x), toCanvasY(metrics, y));
  }

  /** Spreads a blast's ring from where it went off. */
  ring(x: number, y: number, now: number, metrics: FieldMetrics): void {
    const at = this.nextRing;
    this.nextRing = (at + 1) % RING_POOL;
    this.ringsAt[at] = now;
    this.rings[at]
      ?.setPosition(toCanvasX(metrics, x), toCanvasY(metrics, y))
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
    const at = this.nextFade;
    this.nextFade = (at + 1) % MAX_BALLS;
    this.fadesAt[at] = now;
    this.fades[at]
      ?.setFrame(frame)
      .setPosition(toCanvasX(metrics, x), toCanvasY(metrics, y))
      .setAlpha(1)
      .setVisible(true);
  }

  /** Moves each ring and fade on to the time, and hides those that are over. */
  animate(now: number): void {
    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i];
      if (!ring?.visible) continue;
      const done = shareDone(this.ringsAt[i] ?? now, now, RING_MS);
      ring.setScale(ringScale(done)).setAlpha(fadeAlpha(done));
      if (done === 1) ring.setVisible(false);
    }
    for (let i = 0; i < this.fades.length; i++) {
      const fade = this.fades[i];
      if (!fade?.visible) continue;
      const done = shareDone(this.fadesAt[i] ?? now, now, FADE_MS);
      fade.setAlpha(fadeAlpha(done));
      if (done === 1) fade.setVisible(false);
    }
  }

  /** Stops everything bursting, as a new field starts. */
  reset(): void {
    this.shards.killAll();
    for (const ring of this.rings) ring.setVisible(false);
    for (const fade of this.fades) fade.setVisible(false);
    this.scene.cameras.main.resetFX();
  }
}
