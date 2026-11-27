import { itemAt } from "@fz/core/records";
import { type Playing, Turns } from "@fz/core/turns";
import type { GameObjects, Scene } from "phaser";
import { FRAMES } from "../../view/art/frame_names";
import { markAlpha, markRise, markScale } from "../../view/effects/flourishes";
import { POOLS } from "../../view/timeline/limits";
import { ATLAS } from "../atlas";
import {
  type PaintContext,
  type Painter,
  acrossOf,
  downOf,
  shownScale,
} from "./painter";

/** Describes a wave's mark showing over the board, from its moment on the scene's clock, at its place in squares. */
interface Mark extends Playing {
  readonly image: GameObjects.Image;
  /** How long it shows, in milliseconds of the scene's clock. */
  ms: number;
}

/**
 * Draws each wave's mark, "×2" to "×9", over the board from its moment,
 * popping up, rising and fading over its time, from a pool as large as the
 * timeline's limits let show at once, each played in turn; a mark still
 * showing as the next play starts plays on, at its place on the board as
 * the board is laid out.
 */
export class MarksPainter implements Painter {
  /** A mark for each that may show at once. */
  readonly marks: Turns<Mark>;

  /** Makes every mark's image, hidden, in a layer. */
  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.marks = new Turns(POOLS.mark, () => ({
      at: Number.NEGATIVE_INFINITY,
      x: 0,
      y: 0,
      image: scene.add.image(0, 0, ATLAS, FRAMES.times(2)).setVisible(false),
      ms: 0,
    }));
    layer.add(this.marks.all.map(({ image }) => image));
  }

  /** Starts each mark whose moment comes in the frame, and draws every mark showing as it stands. */
  draw(context: Readonly<PaintContext>): void {
    const { play, clock, metrics } = context;
    const { marks } = play.timeline;
    for (let index = 0; index < marks.length; index++) {
      const mark = itemAt(marks, index);
      if (!clock.starts(mark.atMs)) continue;
      const playing = this.marks.play(
        mark.at.x,
        mark.at.y,
        clock.nowOf(mark.atMs),
      );
      playing.ms = play.feel.markMs;
      playing.image.setFrame(FRAMES.times(mark.times)).setVisible(true);
    }
    const scale = shownScale(context);
    const all = this.marks.all;
    for (let index = 0; index < all.length; index++) {
      const mark = itemAt(all, index);
      if (!mark.image.visible) continue;
      const done = (clock.nowMs - mark.at) / mark.ms;
      if (done >= 1) {
        mark.image.setVisible(false);
        continue;
      }
      mark.image
        .setPosition(
          acrossOf(metrics, mark.x),
          downOf(metrics, mark.y - markRise(done, play.feel)),
        )
        .setScale(scale * markScale(done))
        .setAlpha(markAlpha(done));
    }
  }
}
