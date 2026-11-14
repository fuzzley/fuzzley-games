import { fadeAlpha, lerp, shareDone } from "@fz/core/math";
import { cssHex } from "@fz/phaser/color";
import { whenSceneEnds } from "@fz/phaser/scene";
import type { GameObjects, Scene, Types } from "phaser";
import { STREAK_FRAMES } from "../../view/art/streak_art";
import { countAlpha, streakRingScale } from "../../view/effects/flourish";
import {
  COUNT_TEXT,
  COUNT_WEIGHT,
  type FieldPlace,
  STREAK_STEPS,
  countCorner,
  nearestBall,
} from "../../view/effects/streak";
import { STREAK_MS } from "../../view/effects/timing";
import { toCanvasX, toCanvasY } from "../../view/field/field_metrics";
import type { FieldEvent, FieldView } from "../../view/field/frame";
import { ATLAS } from "../atlas";
import type { Baked, PaintContext, Painter } from "./painter";

/** The family a canvas writes in where the page names none. */
const FALLBACK_FAMILY = "sans-serif";

/** Describes the streak's step playing: when it began, where its ball was last drawn, and what it shows. */
interface Step extends FieldPlace {
  /** When it began, in the flourishes' time, or -Infinity before the first. */
  at: number;
  /** The ball it follows, by its place among the field's balls, or -1 for none. */
  ball: number;
  /** The count it shows, or null where its streak has none written. */
  count: GameObjects.Text | null;
}

/**
 * Draws a streak's step, where motion is welcome: a ring about the ball
 * nearest the brick that took the streak there, spreading as it fades, and
 * the streak's count beside the ball, the one thing written over the field,
 * both following the ball, in the balls' color. Each count is a `Text` in
 * the page's font, written once for its step, and again only at a bake,
 * once the page has loaded the font, or for balls of another kind, so a
 * step played writes nothing; a step played takes the place of one still
 * playing.
 */
export class StreakPainter implements Painter {
  /** The ring, white, tinted as the balls are. */
  readonly ring: GameObjects.Image;
  /** A count for each step, by the streak it steps at. */
  readonly counts: ReadonlyMap<number, GameObjects.Text>;

  /** The family the counts are written in: the page's, as the canvas has it. */
  private readonly family: string;
  /** The step playing, or the last one played. */
  private readonly step: Step = {
    at: -Infinity,
    x: 0,
    y: 0,
    ball: -1,
    count: null,
  };
  /** Where the count's top left corner lies, in field units, written each frame it shows. */
  private readonly corner: FieldPlace = { x: 0, y: 0 };
  /** The color the counts are written in, the balls'. */
  private countColor: number;

  /** Makes the ring, and writes each step's count at the field's scale, in the palette. */
  constructor(scene: Scene, layer: GameObjects.Layer, baked: Readonly<Baked>) {
    this.family = familyOf(scene.game.canvas);
    this.ring = scene.add
      .image(0, 0, ATLAS, STREAK_FRAMES.ring)
      .setVisible(false);
    const style = countStyle(this.family, baked);
    this.countColor = baked.palette.balls.normal;
    this.counts = new Map(
      STREAK_STEPS.map((streak) => [
        streak,
        scene.add.text(0, 0, String(streak), style).setVisible(false),
      ]),
    );
    layer.add([this.ring, ...this.counts.values()]);
    rewriteOnceLoaded(scene, this.family, this.counts.values());
  }

  /** Plays a step a broken brick took the streak to, about the ball in flight nearest it. */
  play(event: Readonly<FieldEvent>, field: FieldView, now: number): void {
    const { step } = this;
    step.count?.setVisible(false);
    step.at = now;
    step.x = event.x;
    step.y = event.y;
    step.ball = nearestBall(field.balls, event.x, event.y);
    step.count = this.counts.get(event.streak) ?? null;
  }

  /**
   * Moves the step playing on to the flourishes' time, the ring spreading
   * and fading and the count fading, about its ball as it is drawn or where
   * it was last, and hides them once it is over.
   */
  draw({ field, alpha, metrics, palette, now }: Readonly<PaintContext>): void {
    const { step, ring, corner } = this;
    const done = shareDone(step.at, now, STREAK_MS);
    ring.setVisible(done < 1);
    step.count?.setVisible(done < 1);
    if (done === 1) return;
    const ball = field.balls[step.ball];
    if (ball?.live) {
      step.x = lerp(ball.lastX, ball.x, alpha);
      step.y = lerp(ball.lastY, ball.y, alpha);
    }
    const color = palette.balls[field.ballKind];
    ring
      .setPosition(toCanvasX(metrics, step.x), toCanvasY(metrics, step.y))
      .setScale(streakRingScale(done))
      .setAlpha(fadeAlpha(done))
      .setTint(color);
    const { count } = step;
    if (!count) return;
    if (color !== this.countColor) this.writeIn(color);
    countCorner(
      step,
      count.width / metrics.unit,
      count.height / metrics.unit,
      corner,
    );
    // Whole pixels, so the count's canvas shows a pixel to a pixel, crisp.
    count
      .setPosition(
        Math.round(toCanvasX(metrics, corner.x)),
        Math.round(toCanvasY(metrics, corner.y)),
      )
      .setAlpha(countAlpha(done));
  }

  /** Writes each count again at the unit the atlas was baked at, in its palette. */
  refresh(baked: Readonly<Baked>): void {
    const style = countStyle(this.family, baked);
    this.countColor = baked.palette.balls.normal;
    for (const count of this.counts.values()) count.setStyle(style);
  }

  /** Stops the step playing, as a new field starts. */
  reset(): void {
    this.step.at = -Infinity;
    this.ring.setVisible(false);
    this.step.count?.setVisible(false);
  }

  /** Writes each count again in the color of balls of another kind. */
  private writeIn(color: number): void {
    this.countColor = color;
    const css = cssHex(color);
    for (const count of this.counts.values()) count.setColor(css);
  }
}

/** Returns the font family a canvas inherits from the page, or a canvas's own where it names none. */
function familyOf(canvas: HTMLCanvasElement): string {
  const family =
    canvas.ownerDocument.defaultView?.getComputedStyle(canvas).fontFamily ?? "";
  return family === "" ? FALLBACK_FAMILY : family;
}

/** Returns how a count is written at the unit the atlas was baked at, in its palette: bold, in a normal ball's color, outlined as a ball is. */
function countStyle(
  family: string,
  { metrics, palette }: Readonly<Baked>,
): Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: family,
    fontSize: `${String(Math.round(COUNT_TEXT.size * metrics.unit))}px`,
    fontStyle: String(COUNT_WEIGHT),
    color: cssHex(palette.balls.normal),
    stroke: cssHex(palette.outline),
    strokeThickness: Math.round(COUNT_TEXT.outline * metrics.unit),
  };
}

/**
 * Writes the counts again once the page has loaded their face, unless the
 * scene has ended: a canvas writes in a fallback rather than wait for one.
 * A page with no font loading, as jsdom's, writes them once.
 */
function rewriteOnceLoaded(
  scene: Scene,
  family: string,
  counts: Iterable<GameObjects.Text>,
): void {
  const page = scene.game.canvas.ownerDocument;
  if (!("fonts" in page)) return;
  const { fonts } = page;
  let ended = false;
  whenSceneEnds(scene, () => {
    ended = true;
  });
  const written = [...counts];
  void fonts.load(`${String(COUNT_WEIGHT)} 16px ${family}`).then(
    () => {
      if (ended) return;
      for (const count of written) count.style.update(true);
    },
    // A face that can't be loaded leaves the counts in the fallback.
    () => undefined,
  );
}
