import { itemAt } from "@fz/core/records";
import { type Playing, Turns } from "@fz/core/turns";
import type { GameObjects, Scene } from "phaser";
import { MOST_SQUARES } from "../../rules/levels/level_rules";
import { dustPuffAlpha, dustPuffRadius } from "../../view/effects/flourishes";
import { DISC } from "../disc";
import {
  type PaintContext,
  type Painter,
  acrossOf,
  downOf,
  tintIn,
} from "./painter";

/** Describes a square's puff of dust, from its moment on the scene's clock, at its square's middle in squares. */
interface Puff extends Playing {
  readonly image: GameObjects.Image;
  /** How long it shows, in milliseconds of the scene's clock. */
  ms: number;
}

/**
 * Draws a puff of thick dust over each square as a layer of its dust is
 * swept off, spreading as it fades, an image of the soft disc from a pool
 * of one a square, each played in turn; a puff still showing as the next
 * play starts plays on.
 */
export class PuffsPainter implements Painter {
  /** A puff for each square. */
  readonly puffs: Turns<Puff>;

  /** Makes every puff's image, hidden, in a layer. */
  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.puffs = new Turns(MOST_SQUARES, () => ({
      at: Number.NEGATIVE_INFINITY,
      x: 0,
      y: 0,
      image: scene.add.image(0, 0, DISC.key).setVisible(false),
      ms: 0,
    }));
    layer.add(this.puffs.all.map(({ image }) => image));
  }

  /** Starts a puff for each layer of dust swept off in the frame, and draws every puff showing as it stands. */
  draw(context: Readonly<PaintContext>): void {
    const { play, clock, metrics, palette } = context;
    const changes = play.timeline.dust;
    for (let index = 0; index < changes.length; index++) {
      const { atMs, at } = itemAt(changes, index);
      if (!clock.starts(atMs)) continue;
      const puff = this.puffs.play(at.x, at.y, clock.nowOf(atMs));
      puff.ms = play.feel.dustPuffMs;
      puff.image.setVisible(true);
    }
    const all = this.puffs.all;
    for (let index = 0; index < all.length; index++) {
      const { image, at, x, y, ms } = itemAt(all, index);
      if (!image.visible) continue;
      const done = (clock.nowMs - at) / ms;
      if (done >= 1) {
        image.setVisible(false);
        continue;
      }
      tintIn(image, palette.dust[2]);
      image
        .setPosition(acrossOf(metrics, x), downOf(metrics, y))
        .setScale((2 * dustPuffRadius(done) * metrics.square) / DISC.size)
        .setAlpha(dustPuffAlpha(done));
    }
  }
}
