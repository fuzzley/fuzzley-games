import { ATLAS } from "@fz/brick-wall/scene/atlas";
import { type Place, toCanvas } from "@fz/brick-wall/view/field_metrics";
import type { GameObjects, Scene } from "phaser";
import {
  MOST_DIGITS,
  PILL_FRAMES,
  digitAcross,
  digitAt,
  digitFrameOf,
  digitsIn,
  pillFrameOf,
  pillPlace,
} from "../../view/art/pill_art";
import type { PaintContext, Painter } from "./painter";

/**
 * Draws the rally beside the fuzzball, in its pill, as the view places it,
 * from its first strike till it lands: a pill as wide as its digits, and
 * each digit over it, from a pool made once, the most a rally is written
 * in.
 */
export class PillPainter implements Painter {
  /** The pill. */
  readonly pill: GameObjects.Image;
  /** A digit for each the pill may hold, from the left: those past the rally's hide. */
  readonly digits: readonly GameObjects.Image[];
  /** Where the pill's middle stands, on the field and then on the canvas, written each frame it shows. */
  private readonly place: Place = { x: 0, y: 0 };
  /** Whether the pill showed the frame before, so a frame of none hides nothing again. */
  private shown = false;

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.pill = scene.add
      .image(0, 0, ATLAS, PILL_FRAMES.pill(1))
      .setVisible(false);
    this.digits = Array.from({ length: MOST_DIGITS }, () =>
      scene.add.image(0, 0, ATLAS, PILL_FRAMES.digit(0)).setVisible(false),
    );
    layer.add([this.pill, ...this.digits]);
  }

  /** Draws the rally in its pill beside the fuzzball, or hides it while the fuzzball has struck nothing. */
  draw({ view, shape, metrics, baked }: Readonly<PaintContext>): void {
    const { ball } = view;
    if (ball.rally === 0) {
      if (this.shown) this.hide();
      return;
    }
    this.shown = true;
    const scale = metrics.unit / baked.unit;
    const length = digitsIn(ball.rally);
    const { pill, place, digits } = this;
    pillPlace(ball, shape.depth, place);
    toCanvas(metrics, place.x, place.y, place);
    const { x: middle, y: down } = place;
    setFrameOf(pill, pillFrameOf(length));
    pill.setPosition(middle, down).setScale(scale).setVisible(true);
    // Read by number, as a frame's round of the digits makes nothing.
    const count = digits.length;
    for (let at = 0; at < count; at++) {
      const digit = digits[at];
      if (digit === undefined) continue;
      if (at >= length) {
        digit.setVisible(false);
        continue;
      }
      const across = middle + digitAcross(length, at) * metrics.unit;
      setFrameOf(digit, digitFrameOf(digitAt(ball.rally, at)));
      digit.setPosition(across, down).setScale(scale).setVisible(true);
    }
  }

  /** Hides the pill and its digits. */
  private hide(): void {
    this.shown = false;
    this.pill.setVisible(false);
    for (const digit of this.digits) digit.setVisible(false);
  }
}

/** Shows a frame on an image, setting it only where it shows another. */
function setFrameOf(image: GameObjects.Image, frame: string): void {
  if (image.frame.name !== frame) image.setFrame(frame);
}
