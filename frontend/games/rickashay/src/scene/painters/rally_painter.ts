import { ATLAS } from "@fz/brick-wall/scene/atlas";
import {
  type FieldMetrics,
  type Place,
  toCanvas,
} from "@fz/brick-wall/view/field_metrics";
import { shareDone } from "@fz/core/math";
import { itemAt } from "@fz/core/records";
import type { ArtScale } from "@fz/phaser/shapes";
import type { GameObjects, Scene } from "phaser";
import {
  MOST_DIGITS,
  MOST_TONGUES,
  RALLY_FRAMES,
  RALLY_PLACE,
  type RallyLength,
  type RallyLook,
  digitAcross,
  digitAt,
  digitFrameOf,
  digitsIn,
  leansLeft,
  rallyLookOf,
  rallyStrength,
  stepsInto,
  tongueAcross,
  tongueHeight,
  tonguesIn,
} from "../../view/art/rally_art";
import { flickerHeight, rallyPopScale } from "../../view/effects/flourish";
import { RALLY_POP_MS } from "../../view/effects/timing";
import type { PaintContext, Painter } from "./painter";

/**
 * Draws the rally where the view places it under the danger line, from its
 * flight's first strike till it lands, in the look its rally has reached:
 * each digit from a pool made once, the most a rally is written in, at the
 * look's strength, its middle on a whole device pixel, so a digit baked at
 * the field's unit stays sharp; and on fire, the tongues of flame behind
 * it, from a pool made once, standing on the floor. Where motion is
 * welcome, the number pops as it steps into a look and the fire flickers;
 * where it isn't, the number takes its look at once and the fire stands
 * still.
 *
 * It sets its images again only as the rally, the layout, the bake or the
 * welcome to motion changes, so a frame where none did sets nothing, but
 * while the number pops or the fire flickers: a new shape is laid out with
 * new metrics, and a new palette baked anew.
 */
export class RallyPainter implements Painter {
  /** A digit for each a rally may be written in, from the left: those past the rally's hide. */
  readonly digits: readonly GameObjects.Image[];
  /** A tongue of flame for each the longest rally's fire burns in, from the left, under the digits: those past the rally's hide, and all but on fire. */
  readonly flames: readonly GameObjects.Image[];
  /** Where the rally's middle stands on the canvas, written as it is laid out. */
  private readonly place: Place = { x: 0, y: 0 };
  /** What the images were last set for: the rally, the layout, the bake, the welcome to motion, and the look shown, or null while the number hides. */
  private readonly drawn: {
    rally: number;
    metrics: FieldMetrics | null;
    baked: ArtScale | null;
    motion: boolean;
    look: RallyLook | null;
  } = { rally: 0, metrics: null, baked: null, motion: false, look: null };
  /** How many digits the rally shown is written in. */
  private length: RallyLength = 1;
  /** The scale the field's unit shows the atlas at, as last laid out. */
  private scale = 1;
  /** How large the number was last drawn through its pop, as a share of its size: 1 at rest. */
  private popped = 1;
  /** When the number last stepped into a look, in the scene's time. */
  private poppedAt = Number.NEGATIVE_INFINITY;

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.flames = Array.from({ length: MOST_TONGUES }, () =>
      scene.add
        .image(0, 0, ATLAS, RALLY_FRAMES.flame)
        .setOrigin(0.5, 1)
        .setVisible(false),
    );
    this.digits = Array.from({ length: MOST_DIGITS }, () =>
      scene.add
        .image(0, 0, ATLAS, RALLY_FRAMES.digit("faint", 0))
        .setVisible(false),
    );
    layer.add([...this.flames, ...this.digits]);
  }

  /**
   * Draws the rally under the danger line in its look, popping as it steps
   * into one and its fire flickering where motion is welcome, or hides it
   * while the fuzzball has struck nothing.
   */
  draw({
    view,
    metrics,
    baked,
    palette,
    now,
    motion,
  }: Readonly<PaintContext>): void {
    const { rally } = view.ball;
    const { drawn } = this;
    const changed =
      rally !== drawn.rally ||
      metrics !== drawn.metrics ||
      baked !== drawn.baked ||
      motion !== drawn.motion;
    if (changed) {
      const look = rally === 0 ? null : rallyLookOf(rally);
      if (motion && look !== null && stepsInto(drawn.look, look)) {
        this.poppedAt = now;
      }
      drawn.rally = rally;
      drawn.metrics = metrics;
      drawn.baked = baked;
      drawn.motion = motion;
      drawn.look = look;
      if (look === null) {
        this.hide();
        return;
      }
      this.scale = metrics.unit / baked.unit;
      this.length = digitsIn(rally);
      toCanvas(metrics, RALLY_PLACE.x, RALLY_PLACE.y, this.place);
      this.write(rally, look, rallyStrength(look, palette));
      this.burn(look, metrics);
    }
    const { look } = drawn;
    if (look === null) return;
    const popped = motion
      ? rallyPopScale(shareDone(this.poppedAt, now, RALLY_POP_MS))
      : 1;
    if (changed || popped !== this.popped) {
      this.popped = popped;
      this.size(popped, metrics.unit);
    }
    if (look === "fire" && (changed || motion)) {
      this.flicker(motion ? now : null);
    }
  }

  /** Shows the rally's digits in a look, at a strength, hiding those past its length. */
  private write(rally: number, look: RallyLook, strength: number): void {
    const { digits, length } = this;
    // Read by number, as a change's round of the digits makes nothing.
    const count = digits.length;
    for (let at = 0; at < count; at++) {
      const digit = itemAt(digits, at);
      if (at >= length) {
        digit.setVisible(false);
        continue;
      }
      setFrameOf(digit, digitFrameOf(look, digitAt(rally, at)));
      digit.setAlpha(strength).setVisible(true);
    }
  }

  /**
   * Places and scales the rally's digits about its middle, drawn larger by
   * a share through a pop, each digit's middle on a whole device pixel.
   */
  private size(popped: number, unit: number): void {
    const { digits, length, place } = this;
    const down = Math.round(place.y);
    const scale = this.scale * popped;
    for (let at = 0; at < length; at++) {
      const across = place.x + digitAcross(length, at) * unit * popped;
      itemAt(digits, at).setPosition(Math.round(across), down).setScale(scale);
    }
  }

  /**
   * Stands the fire's tongues on the floor under the rally, on fire, a
   * tongue for each place behind its digits, leaning out from the middle,
   * and hides the rest; and every tongue but on fire.
   */
  private burn(look: RallyLook, metrics: FieldMetrics): void {
    const { flames, length, place } = this;
    const count = look === "fire" ? tonguesIn(length) : 0;
    const floor = Math.round(metrics.y + metrics.height);
    for (let at = 0; at < flames.length; at++) {
      const flame = itemAt(flames, at);
      if (at >= count) {
        flame.setVisible(false);
        continue;
      }
      const across = place.x + tongueAcross(length, at) * metrics.unit;
      flame
        .setPosition(Math.round(across), floor)
        .setFlipX(leansLeft(length, at))
        .setVisible(true);
    }
  }

  /**
   * Stands each tongue of the fire as tall as it stands at a moment, as it
   * flickers, or at rest for none.
   */
  private flicker(now: number | null): void {
    const { flames, length, scale } = this;
    const count = tonguesIn(length);
    for (let at = 0; at < count; at++) {
      const tall = tongueHeight(length, at);
      itemAt(flames, at).setScale(
        scale,
        scale * (now === null ? tall : tall * flickerHeight(at, now)),
      );
    }
  }

  /** Hides every digit and every tongue of flame. */
  private hide(): void {
    for (const digit of this.digits) digit.setVisible(false);
    for (const flame of this.flames) flame.setVisible(false);
  }
}

/** Shows a frame on an image, setting it only where it shows another. */
function setFrameOf(image: GameObjects.Image, frame: string): void {
  if (image.frame.name !== frame) image.setFrame(frame);
}
