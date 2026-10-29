import type { GameObjects, Scene } from "phaser";
import { MAX_BALLS } from "../rules/tuning";
import { ballFrame } from "../view/art";
import { type FieldMetrics, toCanvasX, toCanvasY } from "../view/field_metrics";
import { type FieldView, between } from "../view/frame";
import { ATLAS } from "./atlas";

/** Draws the balls: an image for each the field may hold, made once, each in the balls' kind. */
export class BallPainter {
  readonly images: readonly GameObjects.Image[];

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.images = Array.from({ length: MAX_BALLS }, () =>
      scene.add.image(0, 0, ATLAS, ballFrame("normal")).setVisible(false),
    );
    layer.add([...this.images]);
  }

  /** Takes up each image's frame again, once the atlas has been baked again. */
  refresh(): void {
    for (const image of this.images) image.setFrame(image.frame.name);
  }

  /** Draws each ball in play between its last place and its next, and hides the rest. */
  draw(field: FieldView, alpha: number, metrics: FieldMetrics): void {
    const frame = ballFrame(field.ballKind);
    this.images.forEach((image, i) => {
      const ball = field.balls[i];
      image.setVisible(ball?.live === true);
      if (!ball?.live) return;
      if (image.frame.name !== frame) image.setFrame(frame);
      image.setPosition(
        toCanvasX(metrics, between(ball.lastX, ball.x, alpha)),
        toCanvasY(metrics, between(ball.lastY, ball.y, alpha)),
      );
    });
  }
}
