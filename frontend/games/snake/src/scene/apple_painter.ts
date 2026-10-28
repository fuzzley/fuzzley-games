import type { GameObjects, Scene } from "phaser";
import type { Square } from "../rules/geometry";
import { type BoardMetrics, centerX, centerY } from "../view/board_metrics";
import { POP_MS } from "../view/timing";
import { APPLE_TEXTURE } from "./textures";

/** Draws the apple, from its baked texture, and pops a new one up. */
export class ApplePainter {
  readonly image: GameObjects.Image;

  constructor(
    private readonly scene: Scene,
    layer: GameObjects.Layer,
  ) {
    this.image = scene.add.image(0, 0, APPLE_TEXTURE).setVisible(false);
    layer.add(this.image);
  }

  /** Takes up the apple's texture again, once it has been baked again. */
  refresh(): void {
    this.image.setTexture(APPLE_TEXTURE);
  }

  /** Puts the apple on its square, or hides it where there is none. */
  place(apple: Square | null, metrics: BoardMetrics): void {
    this.image.setVisible(apple !== null);
    if (apple) {
      this.image.setPosition(centerX(metrics, apple), centerY(metrics, apple));
    }
  }

  /** Shows the apple at its full size, for a new run. */
  reset(): void {
    this.image.setScale(1);
  }

  /** Pops the apple up from nothing. */
  pop(): void {
    this.image.setScale(0);
    this.scene.tweens.add({
      targets: this.image,
      scale: 1,
      duration: POP_MS,
      ease: "Back.Out",
    });
  }
}
