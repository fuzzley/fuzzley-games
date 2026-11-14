import { lerp, shareDone } from "@fz/core/math";
import { FUZZBALL_LOOK } from "@fz/phaser/fuzzball";
import type { GameObjects, Scene } from "phaser";
import type { BallKindId } from "../../rules/catalog/balls";
import { OWN_INK } from "../../rules/paddle/balls";
import { BALL_RADIUS, MAX_BALLS } from "../../rules/tuning";
import { FRAMES, ballFrame, ballGrid } from "../../view/art/art";
import { type Squash, squashAt } from "../../view/effects/flourish";
import { nearestBall } from "../../view/effects/streak";
import { EMBERS_MS, MEET_MS } from "../../view/effects/timing";
import {
  type FieldMetrics,
  toCanvasX,
  toCanvasY,
} from "../../view/field/field_metrics";
import type { FieldEvent, FieldView } from "../../view/field/frame";
import { ATLAS } from "../atlas";
import type { PaintContext, Painter } from "./painter";

/** How far a fire ball goes between one ember and the next, in field units: an ember's width. */
const EMBER_GAP = 0.2;

/** How far a fire ball may go in a frame and still trail embers along the way, in field units; farther, it was served or moved, not flying. */
const TRAIL_JUMP = 3;

/** Says where a ball last left an ember, in canvas pixels. */
interface EmberPlace {
  x: number;
  y: number;
  /** Whether its ball has yet to be drawn since it was last out of play, so its trail starts where it shows. */
  fresh: boolean;
}

/**
 * Draws the balls: an image for each the field may hold, made once, each
 * the fuzzball in the balls' kind, a normal ball's fur lifted by the
 * streak, a friend's in its ink, its eyes looking the way it goes, a sight
 * under a ball that seeks, with a fire ball's trail of embers where motion
 * is welcome, an ember for each gap it goes, however often it is drawn, and
 * a ball squashed for a moment as it meets the paddle.
 */
export class BallPainter implements Painter {
  /** Each ball's sight, under it, shown while it seeks. */
  readonly sights: readonly GameObjects.Image[];
  readonly images: readonly GameObjects.Image[];
  /** Each ball's eyes, over it. */
  readonly eyes: readonly GameObjects.Image[];
  /** Leaves a fire ball's embers behind it, fading as they shrink. */
  readonly embers: GameObjects.Particles.ParticleEmitter;
  /** The balls' kind as last drawn, which a lost ball fades in, though its effect ended as it was lost. */
  drawnKind: BallKindId = "normal";

  /** Where each ball last left an ember, or was drawn without one. */
  private readonly embersAt: readonly EmberPlace[];
  /** When each ball last met the paddle, in the flourishes' time, from which it squashes. */
  private readonly squashedAt: number[];
  /** How the ball being drawn is squashed, written over for each. */
  private readonly squashing: Squash = { across: 1, down: 1, drop: 0 };

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.embers = scene.add.particles(0, 0, ATLAS, {
      frame: FRAMES.ember,
      emitting: false,
      lifespan: EMBERS_MS,
      alpha: { start: 1, end: 0 },
      scale: { start: 1, end: 0.4 },
    });
    this.sights = Array.from({ length: MAX_BALLS }, () =>
      scene.add.image(0, 0, ATLAS, FRAMES.sight).setVisible(false),
    );
    this.images = this.sights.map(() =>
      scene.add.image(0, 0, ATLAS, ballFrame("normal", 0)).setVisible(false),
    );
    this.eyes = this.images.map(() =>
      scene.add.image(0, 0, ATLAS, FRAMES.eyes).setVisible(false),
    );
    this.embersAt = this.images.map(() => ({ x: 0, y: 0, fresh: true }));
    this.squashedAt = this.images.map(() => -Infinity);
    layer.add([this.embers, ...this.sights, ...this.images, ...this.eyes]);
  }

  /**
   * Draws each ball in play between its last place and its next, in its
   * kind's frame at the streak and its ink, squashed as it meets the
   * paddle, its sight under it while it seeks, and hides the rest, leaving
   * embers along each fire ball's way if motion is welcome.
   */
  draw({ field, alpha, metrics, motion, now }: Readonly<PaintContext>): void {
    this.drawnKind = field.ballKind;
    const trails = motion && field.ballKind === "fire";
    const by = ballGrid(metrics);
    for (let i = 0; i < this.images.length; i++) {
      const image = this.images[i];
      const eyes = this.eyes[i];
      const sight = this.sights[i];
      const ball = field.balls[i];
      const ember = this.embersAt[i];
      if (!image || !eyes || !sight || !ember) continue;
      image.setVisible(ball?.live === true);
      eyes.setVisible(ball?.live === true);
      sight.setVisible(
        ball?.live === true && !ball.held && (ball.seeks || field.seeking),
      );
      if (!ball?.live) {
        ember.fresh = true;
        continue;
      }
      const frame = ballFrame(field.ballKind, field.streak, ball.ink);
      if (image.frame.name !== frame) image.setFrame(frame);
      image.setPosition(
        toCanvasX(metrics, lerp(ball.lastX, ball.x, alpha)),
        toCanvasY(metrics, lerp(ball.lastY, ball.y, alpha)),
      );
      eyes.setPosition(
        image.x + ball.dx * FUZZBALL_LOOK.across * by,
        image.y + ball.dy * FUZZBALL_LOOK.down * by,
      );
      sight.setPosition(image.x, image.y);
      if (trails && !ember.fresh) {
        this.trail(ember, image.x, image.y, metrics);
      } else {
        ember.x = image.x;
        ember.y = image.y;
      }
      ember.fresh = false;
      this.squashPicture(i, now, metrics.unit, image, eyes);
    }
  }

  /**
   * Returns the ink of the ball a field lost at a place across it, one shown
   * in play until it was lost, which its fade wears, or the player's own
   * where none was.
   */
  lostInk(field: FieldView, x: number): number {
    const lost = field.balls.find(
      (ball, i) => !ball.live && ball.x === x && this.images[i]?.visible,
    );
    return lost?.ink ?? OWN_INK;
  }

  /** Puts out every ember, and rounds every ball, as a new field starts. */
  reset(): void {
    this.embers.killAll();
    this.squashedAt.fill(-Infinity);
  }

  /** Starts squashing the ball in play nearest where a ball met the paddle. */
  squash(event: Readonly<FieldEvent>, field: FieldView, now: number): void {
    const slot = nearestBall(field.balls, event.x, event.y, "inPlay");
    if (slot >= 0) this.squashedAt[slot] = now;
  }

  /**
   * Squashes the picture of the ball in a slot and its eyes, wider and
   * flatter and dropped toward the paddle, as far as its meeting with the
   * paddle has come, or leaves them round where they were put.
   */
  private squashPicture(
    slot: number,
    now: number,
    unit: number,
    image: GameObjects.Image,
    eyes: GameObjects.Image,
  ): void {
    const done = shareDone(this.squashedAt[slot] ?? -Infinity, now, MEET_MS);
    squashAt(done, this.squashing);
    const { across, down, drop } = this.squashing;
    const lower = drop * BALL_RADIUS * unit;
    image.setScale(across, down).setY(image.y + lower);
    eyes.setScale(across, down).setY(eyes.y + lower);
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
