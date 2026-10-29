import type { GameObjects, Scene } from "phaser";
import type { BallKindId } from "../rules/catalog/balls";
import { MAX_BALLS } from "../rules/tuning";
import { FRAMES, ballFrame } from "../view/art";
import { type FieldMetrics, toCanvasX, toCanvasY } from "../view/field_metrics";
import { type FieldView, between } from "../view/frame";
import { EMBERS_MS } from "../view/timing";
import { ATLAS } from "./atlas";

/** How far a fire ball goes between one ember and the next, in field units: an ember's width. */
const EMBER_GAP = 0.2;

/** How far a fire ball may go in a frame and still trail embers along the way, in field units; farther, it was served or moved, not flying. */
const TRAIL_JUMP = 3;

/** Says where a ball last left an ember, in canvas pixels. */
interface EmberPlace {
  x: number;
  y: number;
}

/**
 * Draws the balls: an image for each the field may hold, made once, each in
 * the balls' kind, with a fire ball's trail of embers where motion is
 * welcome, an ember for each gap it goes, however often it is drawn.
 */
export class BallPainter {
  readonly images: readonly GameObjects.Image[];
  /** Leaves a fire ball's embers behind it, fading as they shrink. */
  readonly embers: GameObjects.Particles.ParticleEmitter;
  /** The balls' kind as last drawn, which a lost ball fades in, though its effect ended as it was lost. */
  drawnKind: BallKindId = "normal";

  /** Where each ball last left an ember, or was drawn without one. */
  private readonly embersAt: readonly EmberPlace[];

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
    this.embersAt = this.images.map(() => ({ x: 0, y: 0 }));
    layer.add([this.embers, ...this.images]);
  }

  /** Takes up each image's frame again, once the atlas has been baked again. */
  refresh(): void {
    for (const image of this.images) image.setFrame(image.frame.name);
  }

  /**
   * Draws each ball in play between its last place and its next, and hides
   * the rest, leaving embers along each fire ball's way if motion is
   * welcome.
   */
  draw(
    field: FieldView,
    alpha: number,
    metrics: FieldMetrics,
    motion: boolean,
  ): void {
    this.drawnKind = field.ballKind;
    const frame = ballFrame(field.ballKind);
    const trails = motion && field.ballKind === "fire";
    for (let i = 0; i < this.images.length; i++) {
      const image = this.images[i];
      const ball = field.balls[i];
      const ember = this.embersAt[i];
      if (!image || !ember) continue;
      image.setVisible(ball?.live === true);
      if (!ball?.live) continue;
      if (image.frame.name !== frame) image.setFrame(frame);
      image.setPosition(
        toCanvasX(metrics, between(ball.lastX, ball.x, alpha)),
        toCanvasY(metrics, between(ball.lastY, ball.y, alpha)),
      );
      if (trails) {
        this.trail(ember, image.x, image.y, metrics);
      } else {
        ember.x = image.x;
        ember.y = image.y;
      }
    }
  }

  /** Puts out every ember, as a new field starts. */
  reset(): void {
    this.embers.killAll();
  }

  /** Leaves an ember at each gap along a ball's way from where it last left one, and none where it stands still. */
  private trail(
    ember: EmberPlace,
    x: number,
    y: number,
    metrics: FieldMetrics,
  ): void {
    const dx = x - ember.x;
    const dy = y - ember.y;
    const way = Math.hypot(dx, dy);
    if (way > TRAIL_JUMP * metrics.unit) {
      ember.x = x;
      ember.y = y;
      return;
    }
    const gap = EMBER_GAP * metrics.unit;
    const embers = Math.floor(way / gap);
    if (embers === 0) return;
    const stepX = (dx * gap) / way;
    const stepY = (dy * gap) / way;
    for (let k = 1; k <= embers; k++) {
      this.embers.emitParticleAt(ember.x + k * stepX, ember.y + k * stepY, 1);
    }
    ember.x += embers * stepX;
    ember.y += embers * stepY;
  }
}
