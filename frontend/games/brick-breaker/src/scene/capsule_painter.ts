import type { GameObjects, Scene } from "phaser";
import { FALLING_POOL } from "../rules/capsules";
import { capsuleFrame } from "../view/art";
import { toCanvasX, toCanvasY } from "../view/field_metrics";
import { between } from "../view/frame";
import { ATLAS } from "./atlas";
import type { PaintContext, Painter } from "./painter";

/** Draws the capsules falling: an image for each record the field keeps, made once. */
export class CapsulePainter implements Painter {
  readonly images: readonly GameObjects.Image[];

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.images = Array.from({ length: FALLING_POOL }, () =>
      scene.add.image(0, 0, ATLAS, capsuleFrame("wide")).setVisible(false),
    );
    layer.add([...this.images]);
  }

  /** Takes up each image's frame again, once the atlas has been baked again. */
  refresh(): void {
    for (const image of this.images) image.setFrame(image.frame.name);
  }

  /** Draws each capsule falling between its last place and its next, and hides the rest. */
  draw({ field, alpha, metrics }: Readonly<PaintContext>): void {
    for (let i = 0; i < this.images.length; i++) {
      const image = this.images[i];
      const falling = field.falling[i];
      if (!image) continue;
      image.setVisible(falling?.live === true);
      if (!falling?.live) continue;
      const frame = capsuleFrame(falling.id);
      if (image.frame.name !== frame) image.setFrame(frame);
      image.setPosition(
        toCanvasX(metrics, falling.x),
        toCanvasY(metrics, between(falling.lastY, falling.y, alpha)),
      );
    }
  }
}
