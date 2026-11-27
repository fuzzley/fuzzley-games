import { itemAt } from "@fz/core/records";
import type { GameObjects, Scene } from "phaser";
import { MOST_SQUARES } from "../../rules/levels/level_rules";
import { FRAMES } from "../../view/art/frame_names";
import { opacityOf } from "../../view/art/piece_look";
import { FEEL } from "../../view/timeline/feel";
import type { Sampled } from "../../view/timeline/timeline";
import { ATLAS } from "../atlas";
import {
  type PaintContext,
  type Painter,
  acrossOf,
  downOf,
  shownScale,
} from "./painter";
import { PieceSprite } from "./piece_sprite";

/**
 * Draws each loose sprite of the play's timeline that shows at the frame's
 * moment, a sprite that is no piece on the board: a frame flying loose, as
 * a brick's cushion knocked off or a cage's bar, each an image of a pool
 * as large as the design's budget of loose bits on the board at once,
 * which the timeline's limits hold its tufts and frames to together; and a
 * piece's copy, as a wisp's in flight, each of a pool of a copy a
 * square.
 */
export class LoosePainter implements Painter {
  /** An image for each loose frame that may show at once. */
  readonly frames: readonly GameObjects.Image[];
  /** A sprite for each piece's copy that may show at once. */
  readonly copies: readonly PieceSprite[];
  /** How many loose frames the frame before drew. */
  private drawnFrames = 0;
  /** How many pieces' copies the frame before drew. */
  private drawnCopies = 0;

  /** Makes every loose sprite, hidden, in a layer. */
  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.frames = Array.from({ length: FEEL.mostLooseBits }, () =>
      scene.add.image(0, 0, ATLAS, FRAMES.square).setVisible(false),
    );
    layer.add([...this.frames]);
    this.copies = Array.from(
      { length: MOST_SQUARES },
      () => new PieceSprite(scene, layer),
    );
  }

  /** Draws each loose sprite shown at the frame's moment, and hides those left over. */
  draw(context: Readonly<PaintContext>): void {
    const tracks = context.play.timeline.sprites;
    const sampledSprites = context.frame.sprites;
    let frames = 0;
    let copies = 0;
    for (let index = 0; index < tracks.length; index++) {
      const sampled = itemAt(sampledSprites, index);
      if (!sampled.shown) continue;
      const { drawn } = itemAt(tracks, index);
      if (drawn.what === "copy") {
        this.copies[copies++]?.paint(sampled, drawn.piece, context);
        continue;
      }
      const image = this.frames[frames++];
      if (image === undefined) continue;
      if (image.frame.name !== drawn.frame) image.setFrame(drawn.frame);
      placeLoose(image, sampled, context);
    }
    for (let index = frames; index < this.drawnFrames; index++) {
      this.frames[index]?.setVisible(false);
    }
    for (let index = copies; index < this.drawnCopies; index++) {
      this.copies[index]?.hide();
    }
    this.drawnFrames = Math.min(frames, this.frames.length);
    this.drawnCopies = Math.min(copies, this.copies.length);
  }
}

/** Shows a loose frame's image where its sprite is sampled at the frame's moment. */
function placeLoose(
  image: GameObjects.Image,
  sampled: Readonly<Sampled>,
  context: Readonly<PaintContext>,
): void {
  const { metrics } = context;
  const scale = shownScale(context);
  if (image.depth !== sampled.raise) image.setDepth(sampled.raise);
  image
    .setPosition(
      acrossOf(metrics, sampled.x + sampled.leanX),
      downOf(metrics, sampled.y + sampled.leanY),
    )
    .setScale(scale * sampled.scaleX, scale * sampled.scaleY)
    .setRotation(sampled.rotation)
    .setAlpha(opacityOf(sampled.fade))
    .setVisible(true);
}
