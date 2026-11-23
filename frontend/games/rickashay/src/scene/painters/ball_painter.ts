import { ATLAS } from "@fz/brick-wall/scene/atlas";
import { flareScale } from "@fz/brick-wall/view/easing";
import {
  type FieldMetrics,
  type Place,
  toCanvas,
} from "@fz/brick-wall/view/field_metrics";
import { FLARE_MS } from "@fz/brick-wall/view/timing";
import { shareDone } from "@fz/core/math";
import type { GameObjects, Scene } from "phaser";
import { EFFECT_FRAMES } from "../../view/art/effect_frames";
import { FRAMES } from "../../view/art/frames";
import { bodyFrameOf, eyesAt, eyesFrameOf } from "../../view/art/fuzzball_art";
import { type StreakPlace, streakPlaceOf } from "../../view/effects/flourish";
import type { BallView } from "../../view/run_state";
import type { PaintContext, Painter } from "./painter";

/**
 * Draws the fuzzball, waiting or in the air, at its middle: its body in its
 * look by its flight's rally, or as the hot shot, and its eyes over it,
 * looking the way it flies, up while it waits, and half shut as it drops
 * home, each an image made once. It flares the waiting fuzzball into a hot
 * shot, and draws the streak behind it as it dashes home, under it, in its
 * own color, till it lands.
 */
export class BallPainter implements Painter {
  /** The fuzzball's body. */
  readonly body: GameObjects.Image;
  /** Its eyes, over its body. */
  readonly eyes: GameObjects.Image;
  /** The streak behind it as it dashes home, under its body. */
  readonly streak: GameObjects.Image;
  /** Where the fuzzball's body stands on the canvas, then its eyes on the field and on the canvas, and the streak's middle, written each frame. */
  private readonly place: Place = { x: 0, y: 0 };
  /** Where the streak shows on the field, written each frame it does. */
  private readonly streakPlace: StreakPlace = { x: 0, y: 0, angle: 0 };
  /** Whether the fuzzball dashes home, streaking, from its flight's last strike till it lands. */
  private dashing = false;
  /** When the fuzzball last flared into a hot shot, in the scene's time. */
  private flaredAt = Number.NEGATIVE_INFINITY;

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.streak = scene.add
      .image(0, 0, ATLAS, EFFECT_FRAMES.streak)
      .setVisible(false);
    this.body = scene.add.image(0, 0, ATLAS, FRAMES.fuzzball(0));
    this.eyes = scene.add.image(0, 0, ATLAS, FRAMES.eyes);
    layer.add([this.streak, this.body, this.eyes]);
  }

  /** Streaks the fuzzball as it dashes home from its flight's last strike, till it lands. */
  dash(): void {
    this.dashing = true;
  }

  /** Flares the waiting fuzzball into a hot shot, from a time. */
  flare(now: number): void {
    this.flaredAt = now;
  }

  /** Draws the fuzzball where the view has it, in its look, its eyes where it looks, and the streak behind it as it dashes home. */
  draw({ view, metrics, baked, now }: Readonly<PaintContext>): void {
    const { ball } = view;
    const unit = metrics.unit / baked.unit;
    const flaring = shareDone(this.flaredAt, now, FLARE_MS);
    const scale = flaring < 1 ? unit * flareScale(flaring) : unit;
    const { body, eyes, place } = this;
    this.drawStreak(ball, metrics, unit);
    const look = bodyFrameOf(ball);
    if (body.frame.name !== look) body.setFrame(look);
    toCanvas(metrics, ball.x, ball.y, place);
    body.setPosition(place.x, place.y).setScale(scale);
    const shut = eyesFrameOf(ball);
    if (eyes.frame.name !== shut) eyes.setFrame(shut);
    eyesAt(ball, place);
    toCanvas(metrics, place.x, place.y, place);
    eyes.setPosition(place.x, place.y).setScale(scale);
  }

  /** Draws the streak behind the fuzzball while it dashes home, in the hot shot's color for one, and hides it once it heads nowhere. */
  private drawStreak(
    ball: BallView,
    metrics: FieldMetrics,
    scale: number,
  ): void {
    const { streak } = this;
    const shows = this.dashing && streakPlaceOf(ball, this.streakPlace);
    if (!shows) {
      this.dashing = false;
      if (streak.visible) streak.setVisible(false);
      return;
    }
    const frame = ball.hot ? EFFECT_FRAMES.hotStreak : EFFECT_FRAMES.streak;
    if (streak.frame.name !== frame) streak.setFrame(frame);
    const { x, y, angle } = shows;
    toCanvas(metrics, x, y, this.place);
    streak
      .setPosition(this.place.x, this.place.y)
      .setRotation(angle)
      .setScale(scale)
      .setVisible(true);
  }
}
