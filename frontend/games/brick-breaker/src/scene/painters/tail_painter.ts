import { lerp } from "@fz/core/math";
import type { GameObjects, Scene } from "phaser";
import { type Ball, OWN_INK } from "../../rules/paddle/balls";
import { MAX_BALLS } from "../../rules/tuning";
import { ballColor } from "../../view/art/art";
import { STREAK_FRAMES } from "../../view/art/streak_art";
import {
  TAIL_MOST,
  Trail,
  tailAlpha,
  tailLength,
  tailScale,
} from "../../view/effects/tail";
import { toCanvasX, toCanvasY } from "../../view/field/field_metrics";
import { ATLAS } from "../atlas";
import type { PaintContext, Painter } from "./painter";

/** Describes a ball's tail: the places it passed and a dot for each it may show. */
interface Tail {
  readonly trail: Trail;
  /** Its dots, nearest first, made once. */
  readonly dots: readonly GameObjects.Image[];
  /** The step its ball last came out of a portal at, as it last followed it. */
  jumpedAt: number;
}

/**
 * Draws a tail behind each ball in play while the field is in a streak,
 * where motion is welcome: a dot at each of the ball's last places, a gap
 * apart, more at each step of the streak, each fainter and smaller than the
 * one before, in its ball's color. Every dot is made once.
 */
export class TailPainter implements Painter {
  /** Each ball's tail, by its place in the field's balls. */
  readonly byBall: readonly Tail[];

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.byBall = Array.from({ length: MAX_BALLS }, () => ({
      trail: new Trail(),
      dots: Array.from({ length: TAIL_MOST }, () =>
        scene.add.image(0, 0, ATLAS, STREAK_FRAMES.dot).setVisible(false),
      ),
      jumpedAt: 0,
    }));
    layer.add(this.byBall.flatMap(({ dots }) => dots));
  }

  /**
   * Follows each ball in flight to where it is drawn, and shows as many of
   * its last places as the streak's tail is long, or none where motion
   * isn't welcome; a ball out of play or on the paddle lays none.
   */
  draw({
    field,
    alpha,
    metrics,
    palette,
    motion,
  }: Readonly<PaintContext>): void {
    const length = motion ? tailLength(field.streak) : 0;
    for (let i = 0; i < this.byBall.length; i++) {
      const tail = this.byBall[i];
      if (!tail) continue;
      const { trail, dots } = tail;
      const ball = field.balls[i];
      if (ball?.live && !ball.held) {
        startAtPortal(tail, ball);
        trail.follow(
          lerp(ball.lastX, ball.x, alpha),
          lerp(ball.lastY, ball.y, alpha),
        );
      } else {
        trail.clear();
      }
      const shown = Math.min(length, trail.length);
      const color = ballColor(field.ballKind, ball?.ink ?? OWN_INK, palette);
      for (let dot = 0; dot < dots.length; dot++) {
        const image = dots[dot];
        if (!image) continue;
        image.setVisible(dot < shown);
        if (dot >= shown) continue;
        const { x, y } = trail.placeOf(dot);
        image
          .setPosition(toCanvasX(metrics, x), toCanvasY(metrics, y))
          .setScale(tailScale(dot, length))
          .setAlpha(tailAlpha(dot, length))
          .setTint(color);
      }
    }
  }

  /** Forgets every ball's places, as a new field starts. */
  reset(): void {
    for (const { trail } of this.byBall) trail.clear();
  }
}

/**
 * Starts a ball's tail afresh where it came out of a portal since the tail
 * last followed it, however near the portal it went into, so no dots lie
 * between the two.
 */
function startAtPortal(tail: Tail, ball: Readonly<Ball>): void {
  if (ball.jumpedAt === tail.jumpedAt) return;
  tail.jumpedAt = ball.jumpedAt;
  tail.trail.clear();
}
