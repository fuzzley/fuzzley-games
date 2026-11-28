import { itemAt } from "@fz/core/records";
import { type Playing, Turns } from "@fz/core/turns";
import type { GameObjects, Scene } from "phaser";
import { BOLT_LENGTH, STREAK_HEAD } from "../../view/art/fluff";
import { FRAMES, RING_RUNGS } from "../../view/art/frame_names";
import { onLadder, ringRung, rungRadius } from "../../view/art/ring_ladder";
import {
  type Streak,
  type StreakRun,
  boltAlpha,
  boltFlipped,
  flashAlpha,
  inkOf,
  ringAlpha,
  ringLine,
  ringRadius,
  streakAt,
} from "../../view/effects/flourishes";
import {
  type GustLine,
  type GustLineRun,
  LONGEST_GUST_LINE,
  gustLineAt,
} from "../../view/effects/gust_line";
import { POOLS } from "../../view/timeline/limits";
import type { Ink } from "../../view/timeline/timeline";
import { ATLAS } from "../atlas";
import { DISC } from "../disc";
import {
  type PaintContext,
  type Painter,
  acrossOf,
  downOf,
  shownScale,
  tintIn,
} from "./painter";

/** The names of the ladder's frames of the ring, by their rungs. */
const RUNG_FRAMES = RING_RUNGS.map((rung) => FRAMES.ring(rung));

/** Describes a ring spreading, from its moment on the scene's clock, from its place in squares. */
interface Ring extends Playing {
  /** The ring's frame, shown until it has spread, for a ring on the ladder. */
  readonly image: GameObjects.Image;
  /** How long it takes to spread, in milliseconds of the scene's clock. */
  ms: number;
  /** How far across it spreads to, in squares. */
  radius: number;
  /** The ink it is stroked in. */
  ink: Ink;
}

/** Describes a dasher's streak running, from its moment on the scene's clock. */
interface StreakShown extends Playing {
  /** The streak's frame, shown from where it sets out until it has run its course. */
  readonly image: GameObjects.Image;
  /** The streak as the timeline spawned it, or null before one first runs. */
  streak: Streak | null;
}

/** Describes a bolt of static, from its moment on the scene's clock, from its place in squares. */
interface Bolt extends Playing {
  /** The bolt's frame, shown until it has gone. */
  readonly image: GameObjects.Image;
  /** How long it flickers, in milliseconds of the scene's clock. */
  ms: number;
  /** Where it strikes, in squares. */
  toX: number;
  toY: number;
}

/** Describes a flash, from its moment on the scene's clock, at its place in squares. */
interface Flash extends Playing {
  /** The soft disc it is drawn in, shown until it has gone. */
  readonly image: GameObjects.Image;
  /** How long it fades, in milliseconds of the scene's clock. */
  ms: number;
  /** How far it reaches, in squares. */
  radius: number;
}

/** Describes a line of wind crossing, from its moment on the scene's clock. */
interface GustLineShown extends Playing {
  /** The line's frame, shown until it has crossed. */
  readonly image: GameObjects.Image;
  /** The line as the timeline spawned it, or null before one first crosses. */
  line: GustLine | null;
}

/** Shows a ring on the ladder in its rung's frame for a share through its spreading, scaled to as far as it has spread, in its ink and as faded as it is. */
function showRung(
  { image, x, y, radius, ink }: Readonly<Ring>,
  done: number,
  context: Readonly<PaintContext>,
): void {
  const { metrics, baked, palette } = context;
  const rung = ringRung(done, radius);
  const frame = itemAt(RUNG_FRAMES, rung);
  if (image.frame.name !== frame) image.setFrame(frame);
  tintIn(image, inkOf(ink, palette));
  image
    .setPosition(acrossOf(metrics, x), downOf(metrics, y))
    .setScale(
      (shownScale(context) * ringRadius(done, radius)) /
        rungRadius(rung, baked),
    )
    .setAlpha(ringAlpha(done));
}

/**
 * Draws the effects a move spawns, each from its moment, playing out by
 * itself, from pools as large as the timeline's limits let show at once,
 * each played in turn, so an effect still showing as the next play starts
 * plays on: each ring spreading and thinning in its ink, from the frame
 * of its ladder's rung for the moment, or a stroke of one `Graphics` for
 * a ring that spreads past the ladder's reach; each dasher's streak
 * tinted in its ink and shown only from where it set out to a little past
 * the board's edge; each frizzball's bolt of static, stretched from it to
 * what it strikes and flickering; each flash, an image of the soft disc
 * in the effects' white; and each line of wind, set along the way the
 * wind blows, as long and as faded as it is a share through its crossing,
 * and cut off a little past the board's edge.
 */
export class EffectsPainter implements Painter {
  /** The rings spreading, and those spread. */
  readonly rings: Turns<Ring>;
  /** The strokes of the rings that spread past the ladder's reach, drawn again each frame one shows. */
  readonly ringLines: GameObjects.Graphics;
  /** The dashers' streaks running, and those run. */
  readonly streaks: Turns<StreakShown>;
  /** The bolts of static flickering, and those gone. */
  readonly bolts: Turns<Bolt>;
  /** The flashes fading, and those gone. */
  readonly flashes: Turns<Flash>;
  /** The lines of wind crossing, and those crossed. */
  readonly gustLines: Turns<GustLineShown>;
  /** Whether the frame before stroked a ring, which this one clears. */
  private ringsStroked = false;
  /** Where the streak being drawn has run, written for each. */
  private readonly run: StreakRun = {
    x: 0,
    y: 0,
    angle: 0,
    behind: 0,
    ahead: 0,
  };
  /** Where the line of wind being drawn has crossed to, written for each. */
  private readonly crossed: GustLineRun = {
    x: 0,
    y: 0,
    angle: 0,
    length: 0,
    shown: 0,
    alpha: 0,
  };

  /** Makes every effect's images, hidden, in their layers. */
  constructor(
    scene: Scene,
    layers: {
      readonly rings: GameObjects.Layer;
      readonly streaks: GameObjects.Layer;
      readonly bolts: GameObjects.Layer;
      readonly flash: GameObjects.Layer;
      readonly gusts: GameObjects.Layer;
    },
  ) {
    const unplayed = { at: Number.NEGATIVE_INFINITY, x: 0, y: 0 };
    const image = (
      layer: GameObjects.Layer,
      key: string,
      frame?: string,
    ): GameObjects.Image => {
      const made = scene.add.image(0, 0, key, frame).setVisible(false);
      layer.add(made);
      return made;
    };
    this.rings = new Turns(POOLS.ring, () => ({
      ...unplayed,
      image: image(layers.rings, ATLAS, itemAt(RUNG_FRAMES, 0)),
      ms: 1,
      radius: 0,
      ink: "white",
    }));
    this.ringLines = scene.add.graphics();
    layers.rings.add(this.ringLines);
    this.streaks = new Turns(POOLS.streak, () => ({
      ...unplayed,
      image: image(layers.streaks, ATLAS, FRAMES.streak),
      streak: null,
    }));
    this.bolts = new Turns(POOLS.bolt, () => ({
      ...unplayed,
      image: image(layers.bolts, ATLAS, FRAMES.bolt),
      ms: 1,
      toX: 0,
      toY: 0,
    }));
    this.flashes = new Turns(POOLS.flash, () => ({
      ...unplayed,
      image: image(layers.flash, DISC.key),
      ms: 1,
      radius: 0,
    }));
    this.gustLines = new Turns(POOLS["gust-line"], () => ({
      ...unplayed,
      image: image(layers.gusts, ATLAS, FRAMES.gustLine),
      line: null,
    }));
  }

  /** Starts each effect whose moment comes in the frame, and draws every effect showing as it stands. */
  draw(context: Readonly<PaintContext>): void {
    this.start(context);
    this.drawRings(context);
    this.drawStreaks(context);
    this.drawBolts(context);
    this.drawFlashes(context);
    this.drawGustLines(context);
  }

  /** Starts each ring, streak, bolt, flash and line of wind of the play's timeline whose moment comes in the frame. */
  private start({ play, clock }: Readonly<PaintContext>): void {
    const { effects } = play.timeline;
    for (let index = 0; index < effects.length; index++) {
      const effect = itemAt(effects, index);
      if (!clock.starts(effect.atMs)) continue;
      const at = clock.nowOf(effect.atMs);
      switch (effect.what) {
        case "ring": {
          const ring = this.rings.play(effect.at.x, effect.at.y, at);
          ring.ms = effect.ms;
          ring.radius = effect.radius;
          ring.ink = effect.ink;
          ring.image.setVisible(onLadder(effect.radius));
          break;
        }
        case "streak": {
          const shown = this.streaks.play(effect.from.x, effect.from.y, at);
          shown.streak = effect;
          shown.image.setVisible(true);
          break;
        }
        case "bolt": {
          const bolt = this.bolts.play(effect.from.x, effect.from.y, at);
          bolt.ms = effect.ms;
          bolt.toX = effect.to.x;
          bolt.toY = effect.to.y;
          bolt.image.setVisible(true);
          break;
        }
        case "flash": {
          const flash = this.flashes.play(effect.at.x, effect.at.y, at);
          flash.ms = effect.ms;
          flash.radius = effect.radius;
          flash.image.setVisible(true);
          break;
        }
        case "gust-line": {
          const shown = this.gustLines.play(effect.at.x, effect.at.y, at);
          shown.line = effect;
          shown.image.setVisible(true);
          break;
        }
        // Fluff is the loose painter's, and a shake the camera's.
        case "fluff":
        case "shake":
          break;
      }
    }
  }

  /** Draws every ring spreading at the frame's moment, hiding each on the ladder that has spread, and clearing the strokes of the frame before. */
  private drawRings(context: Readonly<PaintContext>): void {
    const all = this.rings.all;
    let stroked = false;
    for (let index = 0; index < all.length; index++) {
      const ring = itemAt(all, index);
      const done = (context.clock.nowMs - ring.at) / ring.ms;
      if (done >= 1) {
        if (ring.image.visible) ring.image.setVisible(false);
        continue;
      }
      if (ring.image.visible) {
        showRung(ring, done, context);
        continue;
      }
      if (!stroked) {
        this.ringLines.clear();
        stroked = true;
      }
      this.strokeRing(ring, done, context);
    }
    if (!stroked && this.ringsStroked) this.ringLines.clear();
    this.ringsStroked = stroked;
  }

  /** Strokes a ring past the ladder's reach, as far spread, as thin and as faded as it is a share through its spreading. */
  private strokeRing(
    ring: Readonly<Ring>,
    done: number,
    { metrics, palette }: Readonly<PaintContext>,
  ): void {
    this.ringLines
      .lineStyle(
        ringLine(done) * metrics.square,
        inkOf(ring.ink, palette),
        ringAlpha(done),
      )
      .strokeCircle(
        acrossOf(metrics, ring.x),
        downOf(metrics, ring.y),
        ringRadius(done, ring.radius) * metrics.square,
      );
  }

  /**
   * Draws every dasher's streak running at the frame's moment, its frame
   * set behind its head on its line and cropped to the part of it that
   * shows, and hides each that has run its course.
   */
  private drawStreaks(context: Readonly<PaintContext>): void {
    const { play, clock, metrics, baked, palette } = context;
    const { run } = this;
    const scale = shownScale(context);
    const all = this.streaks.all;
    for (let index = 0; index < all.length; index++) {
      const { image, streak, at } = itemAt(all, index);
      if (!image.visible || streak === null) continue;
      const done = (clock.nowMs - at) / streak.ms;
      if (done >= 1) {
        image.setVisible(false);
        continue;
      }
      streakAt(streak, done, play.grid, run);
      const half = image.frame.width / 2;
      const head = half + STREAK_HEAD * baked.unit;
      const from = Math.max(0, head - run.behind * baked.unit);
      const to = Math.min(image.frame.width, head + run.ahead * baked.unit);
      if (to <= from) {
        image.setAlpha(0);
        continue;
      }
      tintIn(image, inkOf(streak.ink, palette));
      const back = STREAK_HEAD * metrics.square;
      image
        .setPosition(
          acrossOf(metrics, run.x) - Math.cos(run.angle) * back,
          downOf(metrics, run.y) - Math.sin(run.angle) * back,
        )
        .setRotation(run.angle)
        .setScale(scale)
        .setCrop(from, 0, to - from, image.frame.height)
        .setAlpha(1);
    }
  }

  /** Draws every bolt of static at the frame's moment, from its frizzball to what it strikes, fading as it flickers, and hides each that has gone. */
  private drawBolts(context: Readonly<PaintContext>): void {
    const { clock, metrics } = context;
    const scale = shownScale(context);
    const all = this.bolts.all;
    for (let index = 0; index < all.length; index++) {
      const { image, at, ms, x, y, toX, toY } = itemAt(all, index);
      if (!image.visible) continue;
      const since = clock.nowMs - at;
      const done = since / ms;
      if (done >= 1) {
        image.setVisible(false);
        continue;
      }
      const along = Math.hypot(toX - x, toY - y);
      image
        .setPosition(
          acrossOf(metrics, (x + toX) / 2),
          downOf(metrics, (y + toY) / 2),
        )
        .setRotation(Math.atan2(toY - y, toX - x))
        .setScale(
          (scale * along) / BOLT_LENGTH,
          boltFlipped(since) ? -scale : scale,
        )
        .setAlpha(boltAlpha(done));
    }
  }

  /** Draws every flash at the frame's moment, fading, and hides each that has gone. */
  private drawFlashes({
    clock,
    metrics,
    palette,
  }: Readonly<PaintContext>): void {
    const all = this.flashes.all;
    for (let index = 0; index < all.length; index++) {
      const { image, at, ms, x, y, radius } = itemAt(all, index);
      if (!image.visible) continue;
      const done = (clock.nowMs - at) / ms;
      if (done >= 1) {
        image.setVisible(false);
        continue;
      }
      tintIn(image, palette.flare);
      image
        .setPosition(acrossOf(metrics, x), downOf(metrics, y))
        .setScale((2 * radius * metrics.square) / DISC.size)
        .setAlpha(flashAlpha(done));
    }
  }

  /**
   * Draws every line of wind at the frame's moment, as far on, as long and
   * as faded as it is through its crossing, cut off where it runs past the
   * clip beyond the board's edge, and hides each that has crossed.
   */
  private drawGustLines(context: Readonly<PaintContext>): void {
    const { play, clock, metrics, baked } = context;
    const { crossed } = this;
    const scale = shownScale(context);
    const all = this.gustLines.all;
    for (let index = 0; index < all.length; index++) {
      const { image, line, at } = itemAt(all, index);
      if (!image.visible || line === null) continue;
      const done = (clock.nowMs - at) / line.ms;
      if (done >= 1) {
        image.setVisible(false);
        continue;
      }
      gustLineAt(line, done, play.grid, crossed);
      if (crossed.shown === 0) {
        image.setAlpha(0);
        continue;
      }
      if (crossed.shown < 1) {
        // The frame draws the line at its longest about its middle, and the
        // scale shortens all of it alike, so a share of it is a share of
        // that, from its near end.
        const to =
          image.frame.width / 2 +
          (crossed.shown - 0.5) * LONGEST_GUST_LINE * baked.unit;
        image.setCrop(0, 0, to, image.frame.height);
      } else if (image.isCropped) {
        image.setCrop();
      }
      image
        .setPosition(acrossOf(metrics, crossed.x), downOf(metrics, crossed.y))
        .setRotation(crossed.angle)
        .setScale((scale * crossed.length) / LONGEST_GUST_LINE, scale)
        .setAlpha(crossed.alpha);
    }
  }
}
