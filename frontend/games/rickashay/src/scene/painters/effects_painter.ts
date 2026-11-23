import { ATLAS } from "@fz/brick-wall/scene/atlas";
import {
  type Burst,
  StripFlashes,
  EffectsPainter as WallEffects,
  burstOf,
  stillShowing,
} from "@fz/brick-wall/scene/effects";
import { shareDone } from "@fz/core/math";
import { Turns } from "@fz/core/turns";
import type { GameObjects, Scene } from "phaser";
import { EFFECT_FRAMES } from "../../view/art/effect_frames";
import {
  PUFF_ALPHA,
  type Strip,
  swirlScale,
} from "../../view/effects/flourish";
import {
  KICK_MS,
  PORTAL_MS,
  RAMP_FLASH_MS,
  SPARK_MS,
} from "../../view/effects/timing";
import { EFFECTS_ART } from "../atlas";
import type { PaintContext } from "./painter";

/** How many sparks may show at once: three bricks shielding the fuzzball at a turn, and as many at the next two. */
export const MOST_SPARKS = 9;

/** How many swirls may show at once: a portal's and its twin's, at two teleports close together. */
export const MOST_SWIRLS = 4;

/** How many puffs may show at once: two floor bounces spent close together. */
export const MOST_PUFFS = 2;

/** Describes a portal's swirl: a burst, shrinking into the portal or spreading from its twin. */
export interface Swirl extends Burst {
  /** Whether it shrinks into a portal drawing the fuzzball in, rather than spreading from its twin letting it out. */
  inward: boolean;
}

/**
 * Draws what bursts from the wall as things happen on it, as every wall
 * game's effects do: a broken brick's shards, the ring the fuzzball leaves
 * as its fur lifts, and the jump line's flash; and Rickashay's own: a
 * ramp's flash along its long face, a spark off a plated face or a shut
 * lock, a portal's swirl, and a floor bounce's puff. Each is made once,
 * and the scene plays them only where motion is welcome.
 */
export class EffectsPainter extends WallEffects {
  /** A ramp's flash along its long face, for each that may flash at once, played in turn. */
  readonly ramps: StripFlashes;
  /** A spark for each that may show at once, played in turn. */
  readonly sparks: Turns<Burst>;
  /** A swirl for each that may show at once, played in turn. */
  readonly swirls: Turns<Swirl>;
  /** A puff for each that may show at once, played in turn. */
  readonly puffs: Turns<Burst>;
  /**
   * When the last spark, swirl and puff to start started, in the scene's
   * time, or null once a frame has hidden it, so the frames when none of a
   * kind shows go through none of its pool.
   */
  private readonly lastOwn: Record<
    "sparks" | "swirls" | "puffs",
    number | null
  > = {
    sparks: null,
    swirls: null,
    puffs: null,
  };

  constructor(scene: Scene, layer: GameObjects.Layer) {
    super(scene, layer, EFFECTS_ART);
    this.ramps = new StripFlashes(scene, layer, RAMP_FLASH_MS);
    this.puffs = new Turns(MOST_PUFFS, () =>
      burstOf(scene.add.image(0, 0, ATLAS, EFFECT_FRAMES.puff)),
    );
    this.sparks = new Turns(MOST_SPARKS, () =>
      burstOf(scene.add.image(0, 0, ATLAS, EFFECT_FRAMES.spark)),
    );
    this.swirls = new Turns(MOST_SWIRLS, () => ({
      ...burstOf(scene.add.image(0, 0, ATLAS, EFFECT_FRAMES.swirl)),
      inward: true,
    }));
    layer.add([
      ...this.puffs.all.map(({ image }) => image),
      ...this.swirls.all.map(({ image }) => image),
      ...this.sparks.all.map(({ image }) => image),
    ]);
  }

  /** Flashes a ramp along its long face, in a color, from a time. */
  flashRamp(
    { x, y, length, angle }: Readonly<Strip>,
    color: number,
    now: number,
  ): void {
    this.ramps.flash(x, y, length, angle, color, now);
  }

  /** Throws a spark from a place on the field, from a time. */
  spark(x: number, y: number, now: number): void {
    this.sparks.play(x, y, now).image.setVisible(true);
    this.lastOwn.sparks = now;
  }

  /** Swirls a portal's middle on the field, in as it draws the fuzzball in or out as its twin lets it out, from a time. */
  swirl(x: number, y: number, inward: boolean, now: number): void {
    const swirl = this.swirls.play(x, y, now);
    swirl.inward = inward;
    swirl.image.setVisible(true);
    this.lastOwn.swirls = now;
  }

  /** Puffs from a place on the field, as a floor bounce is spent there, from a time. */
  puff(x: number, y: number, now: number): void {
    this.puffs.play(x, y, now).image.setVisible(true);
    this.lastOwn.puffs = now;
  }

  /**
   * Moves everything bursting and flashing on to the scene's time, every
   * wall game's and its own, and hides what is over, passing over a kind
   * none of which shows.
   */
  override draw(context: Readonly<PaintContext>): void {
    super.draw(context);
    this.ramps.draw(context);
    const { now, metrics, baked } = context;
    const scale = metrics.unit / baked.unit;
    const { lastOwn } = this;
    if (lastOwn.sparks !== null) {
      this.spreadAll(this.sparks.all, SPARK_MS, 1, now, metrics, scale);
      lastOwn.sparks = stillShowing(lastOwn.sparks, now, SPARK_MS);
    }
    if (lastOwn.puffs !== null) {
      this.spreadAll(this.puffs.all, KICK_MS, PUFF_ALPHA, now, metrics, scale);
      lastOwn.puffs = stillShowing(lastOwn.puffs, now, KICK_MS);
    }
    if (lastOwn.swirls !== null) {
      const swirls = this.swirls.all;
      const count = swirls.length;
      for (let at = 0; at < count; at++) {
        const swirl = swirls[at];
        if (!swirl?.image.visible) continue;
        const done = shareDone(swirl.at, now, PORTAL_MS);
        this.placeOn(swirl, metrics);
        swirl.image
          .setScale(scale * swirlScale(done, swirl.inward))
          .setVisible(done < 1);
      }
      lastOwn.swirls = stillShowing(lastOwn.swirls, now, PORTAL_MS);
    }
  }
}
