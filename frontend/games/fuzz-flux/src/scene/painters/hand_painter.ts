import { itemAt } from "@fz/core/records";
import type { GameObjects, Scene } from "phaser";
import { FRAMES } from "../../view/art/frame_names";
import { sampleHand } from "../../view/idle/hand";
import { type Frame, frameFor } from "../../view/timeline/sample";
import type { Timeline } from "../../view/timeline/timeline";
import { ATLAS } from "../atlas";
import { type PaintContext, type Painter, placeSprite } from "./painter";

/** Describes the hand's timeline as the shell handed it, when it first did, on the scene's clock, and the records it is sampled into. */
interface HandShown {
  readonly timeline: Timeline;
  readonly fromMs: number;
  readonly frame: Frame;
}

/**
 * Draws the hand showing a move, over everything on the board, again and
 * again from when the shell first hands it, until it hands none.
 */
export class HandPainter implements Painter {
  readonly image: GameObjects.Image;
  /** The hand's timeline as the shell last handed it, or null for none. */
  private shown: HandShown | null = null;

  /** Makes the hand's image, hidden, in a layer. */
  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.image = scene.add.image(0, 0, ATLAS, FRAMES.hand).setVisible(false);
    layer.add(this.image);
  }

  /** Draws the hand where it stands at the frame's moment of its showing, or hides it for none. */
  draw(context: Readonly<PaintContext>): void {
    const { hand, clock, play } = context;
    if (hand === null) {
      this.shown = null;
      this.image.setVisible(false);
      return;
    }
    let { shown } = this;
    if (shown?.timeline !== hand) {
      shown = { timeline: hand, fromMs: clock.nowMs, frame: frameFor(hand) };
      this.shown = shown;
    }
    const sampled = itemAt(
      sampleHand(hand, play.feel, clock.nowMs - shown.fromMs, shown.frame)
        .sprites,
      0,
    );
    if (!sampled.shown) {
      this.image.setVisible(false);
      return;
    }
    placeSprite(this.image, sampled, context);
  }
}
