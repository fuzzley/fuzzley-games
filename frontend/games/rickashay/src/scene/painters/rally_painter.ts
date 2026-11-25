import { ATLAS } from "@fz/brick-wall/scene/atlas";
import {
  type FieldMetrics,
  type Place,
  toCanvas,
} from "@fz/brick-wall/view/field_metrics";
import { itemAt } from "@fz/core/records";
import type { ArtScale } from "@fz/phaser/shapes";
import type { GameObjects, Scene } from "phaser";
import {
  MOST_DIGITS,
  RALLY_FRAMES,
  digitAcross,
  digitAt,
  digitFrameOf,
  digitsIn,
  RALLY_PLACE,
} from "../../view/art/rally_art";
import type { PaintContext, Painter } from "./painter";

/**
 * Draws the rally, small and faint, where the view places it under the
 * danger line, from its flight's first strike till it lands: each digit
 * from a pool made once, the most a rally is written in, at the palette's
 * strength, its middle on a whole device pixel, so a digit baked at the
 * field's unit stays sharp.
 *
 * It sets its digits again only as the rally, the layout or the bake
 * changes, so a frame where none did sets nothing: a new shape is laid out
 * with new metrics, and a new palette baked anew.
 */
export class RallyPainter implements Painter {
  /** A digit for each a rally may be written in, from the left: those past the rally's hide. */
  readonly digits: readonly GameObjects.Image[];
  /** Where the rally's middle stands on the canvas, written as it is laid out. */
  private readonly place: Place = { x: 0, y: 0 };
  /** The rally, the layout and the bake the digits were last set for. */
  private readonly drawn: {
    rally: number;
    metrics: FieldMetrics | null;
    baked: ArtScale | null;
  } = { rally: 0, metrics: null, baked: null };

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.digits = Array.from({ length: MOST_DIGITS }, () =>
      scene.add.image(0, 0, ATLAS, RALLY_FRAMES.digit(0)).setVisible(false),
    );
    layer.add([...this.digits]);
  }

  /** Draws the rally under the danger line, or hides it while the fuzzball has struck nothing. */
  draw({ view, metrics, baked, palette }: Readonly<PaintContext>): void {
    const { rally } = view.ball;
    const { drawn } = this;
    if (
      rally === drawn.rally &&
      metrics === drawn.metrics &&
      baked === drawn.baked
    ) {
      return;
    }
    drawn.rally = rally;
    drawn.metrics = metrics;
    drawn.baked = baked;
    if (rally === 0) {
      this.hide();
      return;
    }
    const scale = metrics.unit / baked.unit;
    const length = digitsIn(rally);
    const { place, digits } = this;
    toCanvas(metrics, RALLY_PLACE.x, RALLY_PLACE.y, place);
    const down = Math.round(place.y);
    // Read by number, as a change's round of the digits makes nothing.
    const count = digits.length;
    for (let at = 0; at < count; at++) {
      const digit = itemAt(digits, at);
      if (at >= length) {
        digit.setVisible(false);
        continue;
      }
      const across = place.x + digitAcross(length, at) * metrics.unit;
      setFrameOf(digit, digitFrameOf(digitAt(rally, at)));
      digit
        .setPosition(Math.round(across), down)
        .setScale(scale)
        .setAlpha(palette.rally.alpha)
        .setVisible(true);
    }
  }

  /** Hides every digit. */
  private hide(): void {
    for (const digit of this.digits) digit.setVisible(false);
  }
}

/** Shows a frame on an image, setting it only where it shows another. */
function setFrameOf(image: GameObjects.Image, frame: string): void {
  if (image.frame.name !== frame) image.setFrame(frame);
}
