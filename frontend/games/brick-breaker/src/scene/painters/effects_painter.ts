import { fadeAlpha, shareDone } from "@fz/core/math";
import { type Playing, Turns } from "@fz/core/turns";
import { GameObjects, type Scene } from "phaser";
import { hasTrait } from "../../rules/catalog/bricks";
import { cellMiddleX, cellMiddleY } from "../../rules/grid";
import { MAX_BALLS } from "../../rules/tuning";
import { FRAMES, ballFrame } from "../../view/art/art";
import { brickFrame } from "../../view/art/brick_art";
import type { BricksPalette } from "../../view/colors/palette";
import {
  openingHeight,
  ringScale,
  shardTint,
} from "../../view/effects/flourish";
import {
  FADE_MS,
  OPEN_MS,
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
import type { FieldView } from "../../view/field/frame";
import { ATLAS } from "../atlas";
import type { Baked, PaintContext, Painter } from "./painter";

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
 * Describes a lost ball's fade: its body, in the frame it flew in, and its
 * eyes over it, looking ahead, played from where it was lost.
 */
export interface Fade extends Burst {
  /** Its eyes, over its body. */
  readonly eyes: GameObjects.Image;
}

/**
 * Returns a ring's or a fade's record over its image, hidden until it first
 * plays; its place on the field is written as it plays but never read, as
 * the image keeps its place on the canvas.
 */
function burstOf(image: GameObjects.Image): Burst {
  return { image: image.setVisible(false), at: -Infinity, x: 0, y: 0 };
}

/** Flies as a broken brick's shard, keeping its brick's color for its tint to dim from. */
class Shard extends GameObjects.Particles.Particle {
  /** The color of the brick it broke from. */
  thrownIn = 0xffffff;
}

/**
 * Draws what bursts from the field as things happen on it: a broken brick's
 * shards, a blast's ring, a lost ball's fade, the gates' opening, and the
 * field's shake. Each is made once, and the scene plays them only where
 * motion is welcome.
 */
export class EffectsPainter implements Painter {
  /**
   * Throws a broken brick's shards, in the brick's color, each dimming from
   * it toward the field's as it falls.
   */
  readonly shards: GameObjects.Particles.ParticleEmitter;
  /**
   * Opens each gate where it stood, as the last key opens them: its frame
   * thinning to a line along its middle and fading, as many at once as a
   * level holds.
   */
  readonly gates: GameObjects.Particles.ParticleEmitter;
  /** A ring for each blast that may spread at once, each played in turn. */
  readonly rings: Turns<Burst>;
  /** A fading ball for each ball that may be lost at once, each played in turn. */
  readonly fades: Turns<Fade>;

  /** The color the shards thrown next take, their brick's. */
  private nextColor = 0xffffff;
  /** The field's color, which the shards dim toward. */
  private field: number;

  constructor(
    private readonly scene: Scene,
    bursts: GameObjects.Layer,
    balls: GameObjects.Layer,
    palette: BricksPalette,
  ) {
    this.field = palette.field;
    this.shards = scene.add.particles(0, 0, ATLAS, {
      frame: FRAMES.shard,
      emitting: false,
      lifespan: SHARDS_MS,
      alpha: { start: 1, end: 0 },
      particleClass: Shard,
      // Each shard keeps its own brick's color, which an emitter's `color`
      // ramp, shared by every shard it holds, couldn't.
      tint: {
        onEmit: (shard) => {
          if (shard instanceof Shard) shard.thrownIn = this.nextColor;
          return this.nextColor;
        },
        onUpdate: (shard, _key, done, tint) =>
          shard instanceof Shard
            ? shardTint(shard.thrownIn, this.field, done)
            : tint,
      },
      rotate: { min: 0, max: 360 },
      // Set for the field's unit as it is laid out; given here, as
      // `updateConfig()` changes only the keys a config already has.
      speed: { min: 0, max: 0 },
      gravityY: 0,
    });
    this.gates = scene.add.particles(0, 0, ATLAS, {
      emitting: false,
      lifespan: OPEN_MS,
      alpha: { start: 1, end: 0 },
      scaleY: {
        onEmit: () => openingHeight(0),
        onUpdate: (_gate, _key, done) => openingHeight(done),
      },
    });
    this.rings = new Turns(RING_POOL, () =>
      burstOf(scene.add.image(0, 0, ATLAS, FRAMES.ring)),
    );
    this.fades = new Turns(MAX_BALLS, () => ({
      ...burstOf(scene.add.image(0, 0, ATLAS, ballFrame("normal", 0))),
      eyes: scene.add.image(0, 0, ATLAS, FRAMES.eyes).setVisible(false),
    }));
    bursts.add([
      this.gates,
      this.shards,
      ...this.rings.all.map(({ image }) => image),
    ]);
    balls.add(this.fades.all.flatMap(({ image, eyes }) => [image, eyes]));
  }

  /**
   * Holds the shards and the opening gates where they are while the last
   * brick's hit holds, and lets them go on after.
   */
  hold(holding: boolean): void {
    this.shards.active = !holding;
    this.gates.active = !holding;
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

  /** Dims the shards toward the field's color as the atlas was baked in. */
  refresh({ palette }: Readonly<Baked>): void {
    this.field = palette.field;
  }

  /** Throws a broken brick's shards from its middle, in its color. */
  shatter(x: number, y: number, color: number, metrics: FieldMetrics): void {
    this.nextColor = color;
    this.shards.explode(SHARDS, toCanvasX(metrics, x), toCanvasY(metrics, y));
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

  /** Fades a lost ball out where it fell, in the frame it flew in, its eyes over it. */
  fade(
    x: number,
    y: number,
    frame: string,
    now: number,
    metrics: FieldMetrics,
  ): void {
    const fade = this.fades.play(x, y, now);
    const canvasX = toCanvasX(metrics, x);
    const canvasY = toCanvasY(metrics, y);
    fade.image
      .setFrame(frame)
      .setPosition(canvasX, canvasY)
      .setAlpha(1)
      .setVisible(true);
    fade.eyes.setPosition(canvasX, canvasY).setAlpha(1).setVisible(true);
  }

  /**
   * Opens every gate of a field, as its last key opened them: each, in its
   * frame, thins to a line along its middle and fades where it stood.
   */
  open(field: FieldView, metrics: FieldMetrics): void {
    for (const brick of field.bricks) {
      if (!brick || !hasTrait(brick.kind, "locked")) continue;
      this.gates
        .setEmitterFrame(brickFrame(brick, field))
        .emitParticleAt(
          toCanvasX(metrics, cellMiddleX(brick.cell)),
          toCanvasY(metrics, cellMiddleY(brick.cell)),
          1,
        );
    }
  }

  /** Moves each ring and fade on to the time the flourishes run by, and hides those that are over. */
  draw({ now }: Readonly<PaintContext>): void {
    for (const { image: ring, at } of this.rings.all) {
      if (!ring.visible) continue;
      const done = shareDone(at, now, RING_MS);
      ring.setScale(ringScale(done)).setAlpha(fadeAlpha(done));
      if (done === 1) ring.setVisible(false);
    }
    for (const { image: body, eyes, at } of this.fades.all) {
      if (!body.visible) continue;
      const done = shareDone(at, now, FADE_MS);
      body.setAlpha(fadeAlpha(done));
      eyes.setAlpha(fadeAlpha(done));
      if (done === 1) {
        body.setVisible(false);
        eyes.setVisible(false);
      }
    }
  }

  /** Stops everything bursting, as a new field starts. */
  reset(): void {
    this.shards.killAll();
    this.gates.killAll();
    for (const { image } of this.rings.all) image.setVisible(false);
    for (const { image, eyes } of this.fades.all) {
      image.setVisible(false);
      eyes.setVisible(false);
    }
    this.scene.cameras.main.resetFX();
  }
}
