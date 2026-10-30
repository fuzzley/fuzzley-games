import type { GameObjects, Scene } from "phaser";
import { isNeeded } from "../rules/catalog/bricks";
import { cellMiddleX, cellMiddleY } from "../rules/grid";
import { FRAMES } from "../view/art";
import { type FieldMetrics, toCanvasX, toCanvasY } from "../view/field_metrics";
import type { FieldView } from "../view/frame";
import { GLOW_BRICKS } from "../view/timing";
import { ATLAS } from "./atlas";

/** Frames the last bricks a level needs, once they glow: an image for each brick that may, made once. */
export class GlowPainter {
  readonly images: readonly GameObjects.Image[];

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.images = Array.from({ length: GLOW_BRICKS }, () =>
      scene.add.image(0, 0, ATLAS, FRAMES.glow).setVisible(false),
    );
    layer.add([...this.images]);
  }

  /** Takes up each image's frame again, once the atlas has been baked again. */
  refresh(): void {
    for (const image of this.images) image.setFrame(FRAMES.glow);
  }

  /** Frames each brick the level still needs, as bright as the glow is, or hides the frames while it is dark. */
  draw(field: FieldView, glow: number, metrics: FieldMetrics): void {
    let shown = 0;
    for (let cell = 0; glow > 0 && cell < field.bricks.length; cell++) {
      const brick = field.bricks[cell];
      if (!brick || brick.broken || !isNeeded(brick.kind)) continue;
      this.images[shown++]
        ?.setPosition(
          toCanvasX(metrics, cellMiddleX(cell)),
          toCanvasY(metrics, cellMiddleY(cell)),
        )
        .setAlpha(glow)
        .setVisible(true);
    }
    for (let i = shown; i < this.images.length; i++) {
      this.images[i]?.setVisible(false);
    }
  }
}
