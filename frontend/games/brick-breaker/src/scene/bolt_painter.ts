import type { GameObjects, Scene } from "phaser";
import { BOLT_POOL } from "../rules/bolts";
import { FRAMES } from "../view/art";
import { type FieldMetrics, toCanvasX, toCanvasY } from "../view/field_metrics";
import { type FieldView, between } from "../view/frame";
import { ATLAS } from "./atlas";

/** Draws the laser's bolts rising: an image for each record the field keeps, made once, hung from its tip. */
export class BoltPainter {
  readonly images: readonly GameObjects.Image[];

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.images = Array.from({ length: BOLT_POOL }, () =>
      scene.add
        .image(0, 0, ATLAS, FRAMES.bolt)
        .setOrigin(0.5, 0)
        .setVisible(false),
    );
    layer.add([...this.images]);
  }

  /** Takes up each image's frame again, once the atlas has been baked again. */
  refresh(): void {
    for (const image of this.images) image.setFrame(FRAMES.bolt);
  }

  /** Draws each bolt rising between its last place and its next, and hides the rest. */
  draw(field: FieldView, alpha: number, metrics: FieldMetrics): void {
    for (let i = 0; i < this.images.length; i++) {
      const image = this.images[i];
      const bolt = field.bolts[i];
      if (!image) continue;
      image.setVisible(bolt?.live === true);
      if (!bolt?.live) continue;
      image.setPosition(
        toCanvasX(metrics, bolt.x),
        toCanvasY(metrics, between(bolt.lastY, bolt.y, alpha)),
      );
    }
  }
}
