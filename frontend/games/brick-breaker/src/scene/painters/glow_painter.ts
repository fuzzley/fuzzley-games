import type { GameObjects, Scene } from "phaser";
import { isNeeded } from "../../rules/catalog/bricks";
import { cellMiddleX, cellMiddleY } from "../../rules/grid";
import { FRAMES } from "../../view/art/art";
import { glowAlpha } from "../../view/effects/flourish";
import { GLOW_BRICKS } from "../../view/effects/timing";
import { toCanvasX, toCanvasY } from "../../view/field/field_metrics";
import { ATLAS } from "../atlas";
import type { PaintContext, Painter } from "./painter";

/** Frames the last bricks a level needs, once they glow: an image for each brick that may, made once. */
export class GlowPainter implements Painter {
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
  draw({ field, metrics, brokeAt, motion }: Readonly<PaintContext>): void {
    const glow = glowAlpha(field, brokeAt, motion);
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
