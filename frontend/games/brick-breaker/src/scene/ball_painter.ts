import type { GameObjects, Scene } from "phaser";
import { MAX_BALLS } from "../rules/tuning";
import { FRAMES, ballFrame } from "../view/art";
import { type FieldMetrics, toCanvasX, toCanvasY } from "../view/field_metrics";
import { type FieldView, between } from "../view/frame";
import { EMBERS_MS } from "../view/timing";
import { ATLAS } from "./atlas";

/**
 * Draws the balls: an image for each the field may hold, made once, each in
 * the balls' kind, with a fire ball's trail of embers where motion is
 * welcome.
 */
export class BallPainter {
  readonly images: readonly GameObjects.Image[];
  /** Leaves a fire ball's embers behind it, fading as they shrink. */
  readonly embers: GameObjects.Particles.ParticleEmitter;

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.embers = scene.add.particles(0, 0, ATLAS, {
      frame: FRAMES.ember,
      emitting: false,
      lifespan: EMBERS_MS,
      alpha: { start: 1, end: 0 },
      scale: { start: 1, end: 0.4 },
    });
    this.images = Array.from({ length: MAX_BALLS }, () =>
      scene.add.image(0, 0, ATLAS, ballFrame("normal")).setVisible(false),
    );
    layer.add([this.embers, ...this.images]);
  }

  /** Takes up each image's frame again, once the atlas has been baked again. */
  refresh(): void {
    for (const image of this.images) image.setFrame(image.frame.name);
  }

  /**
   * Draws each ball in play between its last place and its next, and hides
   * the rest, leaving an ember where each fire ball is if motion is welcome.
   */
  draw(
    field: FieldView,
    alpha: number,
    metrics: FieldMetrics,
    motion: boolean,
  ): void {
    const frame = ballFrame(field.ballKind);
    const trails = motion && field.ballKind === "fire";
    this.images.forEach((image, i) => {
      const ball = field.balls[i];
      image.setVisible(ball?.live === true);
      if (!ball?.live) return;
      if (image.frame.name !== frame) image.setFrame(frame);
      image.setPosition(
        toCanvasX(metrics, between(ball.lastX, ball.x, alpha)),
        toCanvasY(metrics, between(ball.lastY, ball.y, alpha)),
      );
      if (trails) this.embers.emitParticleAt(image.x, image.y, 1);
    });
  }

  /** Puts out every ember, as a new field starts. */
  reset(): void {
    this.embers.killAll();
  }
}
