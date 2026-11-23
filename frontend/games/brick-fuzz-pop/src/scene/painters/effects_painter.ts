import { columnOf, fieldRowOf, wallRowOf } from "@fz/brick-wall/rules/grid";
import { ATLAS } from "@fz/brick-wall/scene/atlas";
import {
  type Burst,
  EffectsPainter as WallEffects,
  burstOf,
  stillShowing,
} from "@fz/brick-wall/scene/effects";
import {
  type FieldMetrics,
  type Place,
  toCanvas,
} from "@fz/brick-wall/view/field_metrics";
import { shareDone } from "@fz/core/math";
import { type Playing, Turns } from "@fz/core/turns";
import type { GameObjects, Scene } from "phaser";
import { MOST_FRIENDS } from "../../rules/tuning";
import type { Wall } from "../../rules/wall/wall";
import { FRAMES } from "../../view/art/frames";
import { hopHeight } from "../../view/effects/flourish";
import { BOLT_MS, HOP_MS } from "../../view/effects/timing";
import { EFFECTS_ART } from "../atlas";
import { FLIGHT_FRAMES } from "../field_art";
import { INKED } from "./ball_painter";
import type { PaintContext } from "./painter";

/** How many pieces of bolt may show at once: a cross zapper's on the deepest field, and as many again for a chain. */
const BOLT_POOL = 96;

/** Describes a freed friend's hop: its body and its eyes, played from its cage's middle, in field units. */
export interface Hop extends Playing {
  readonly body: GameObjects.Image;
  readonly eyes: GameObjects.Image;
}

/**
 * Draws what bursts from the wall as things happen on it, as every wall
 * game's effects do: a broken brick's shards, a punch's streak, a blast's
 * ring and the jump line's flash; and Brick Fuzz Pop's own, a zap's bolt,
 * among the bursts under the rings, and a freed friend's hop down to the
 * floor, among the fuzzballs. Each is made once, and the scene plays them
 * only where motion is welcome.
 */
export class EffectsPainter extends WallEffects {
  /** The pieces a zap's bolt is drawn in, a cell each, played in turn. */
  readonly bolts: Turns<Burst>;
  /** A friend for each that may be freed at once, played in turn. */
  readonly hops: Turns<Hop>;
  /** Where a hop is drawn, written for each. */
  private readonly hopPlace: Place = { x: 0, y: 0 };
  /** How far a zap's bolt runs each way from its brick, in cells, by way: across × 3 + up, each −1 to 1, plus 4. */
  private readonly reaches = new Int32Array(9);
  /**
   * When the last bolt and the last hop to start started, in the scene's
   * time, or null once a frame has hidden it, so the frames when none of a
   * kind shows go through none of its pool.
   */
  private readonly lastOwn: Record<"bolts" | "hops", number | null> = {
    bolts: null,
    hops: null,
  };

  constructor(
    scene: Scene,
    layers: {
      readonly bursts: GameObjects.Layer;
      readonly balls: GameObjects.Layer;
    },
  ) {
    super(scene, layers.bursts, EFFECTS_ART);
    this.bolts = new Turns(BOLT_POOL, () =>
      burstOf(scene.add.image(0, 0, ATLAS, FLIGHT_FRAMES.bolt)),
    );
    this.hops = new Turns(MOST_FRIENDS, () => ({
      body: scene.add.image(0, 0, ATLAS, FRAMES.friend(0)).setVisible(false),
      eyes: scene.add.image(0, 0, ATLAS, FRAMES.eyes).setVisible(false),
      at: Number.NEGATIVE_INFINITY,
      x: 0,
      y: 0,
    }));
    // The bolts burst over the shards and under the rings.
    layers.bursts.addAt(
      this.bolts.all.map(({ image }) => image),
      layers.bursts.getIndex(this.shards) + 1,
    );
    layers.balls.add(this.hops.all.flatMap(({ body, eyes }) => [body, eyes]));
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
    reaches.forEach((reach, way) => {
      const across = Math.floor(way / 3) - 1;
      const up = (way % 3) - 1;
      const angle = Math.atan2(-up, across);
      const length = Math.hypot(across, up);
      for (let step = 0.5; step < reach; step++) {
        const y = fromY + step * up;
        if (y < 0 || y > depth) continue;
        const piece = this.bolts.play(fromX + step * across, y, now);
        piece.angle = angle;
        piece.length = length;
        piece.image.setVisible(true);
      }
    });
    this.lastOwn.bolts = now;
  }

  /** Hops a friend freed in an ink from its cage's middle on the field down to the floor, from a time. */
  hop(x: number, y: number, ink: number, now: number): void {
    const hop = this.hops.play(x, y, now);
    hop.body.setFrame(INKED[ink] ?? FRAMES.friend(0)).setVisible(true);
    hop.eyes.setVisible(true);
    this.lastOwn.hops = now;
  }

  /**
   * Moves everything bursting on to the scene's time, every wall game's
   * and its own, and hides what is over, passing over a kind none of
   * which shows.
   */
  override draw(context: Readonly<PaintContext>): void {
    super.draw(context);
    const { now, metrics, baked } = context;
    const scale = metrics.unit / baked.unit;
    const { lastOwn } = this;
    if (lastOwn.bolts !== null) {
      this.burstAll(this.bolts.all, BOLT_MS, now, metrics, scale);
      lastOwn.bolts = stillShowing(lastOwn.bolts, now, BOLT_MS);
    }
    if (lastOwn.hops !== null) {
      const hops = this.hops.all;
      const count = hops.length;
      for (let at = 0; at < count; at++) {
        const hop = hops[at];
        if (hop?.body.visible) this.hopOn(hop, now, metrics, scale);
      }
      lastOwn.hops = stillShowing(lastOwn.hops, now, HOP_MS);
    }
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
      this.hopPlace,
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
}
