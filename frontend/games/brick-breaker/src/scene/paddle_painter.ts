import type { GameObjects, Scene } from "phaser";
import { BOLT_INSET, PADDLE_HEIGHT } from "../rules/tuning";
import { FRAMES } from "../view/art";
import { type FieldMetrics, toCanvasX, toCanvasY } from "../view/field_metrics";
import { between } from "../view/frame";
import type { BricksPalette } from "../view/palette";
import { lineWidth } from "../view/shapes";
import { ATLAS } from "./atlas";
import type { Baked, PaintContext, Painter } from "./painter";

/**
 * Draws the paddle: a body between the middles of its two round ends, so
 * the ends keep their shape as its width changes, with a laser's cannons
 * over its ends or a catching paddle's rim along its top.
 *
 * The body and the rim are rectangles a pixel wide, scaled across, which
 * draw crisp at any width on either of Phaser's renderers.
 */
export class PaddlePainter implements Painter {
  /** Its body, from the middle of one end to the middle of the other. */
  readonly body: GameObjects.Rectangle;
  /** Its round ends, left and right. */
  readonly ends: readonly GameObjects.Image[];
  /** A catching paddle's rim, a line below its top, along its body. */
  readonly rim: GameObjects.Rectangle;
  /** A laser's cannons, left and right. */
  readonly cannons: readonly GameObjects.Image[];

  /** Makes the paddle at the field's scale, in the palette. */
  constructor(
    scene: Scene,
    layer: GameObjects.Layer,
    metrics: FieldMetrics,
    palette: BricksPalette,
  ) {
    this.body = scene.add.rectangle(0, 0, 1, 1).setOrigin(0.5, 0);
    this.ends = [0, 1].map(() => scene.add.image(0, 0, ATLAS, FRAMES.paddle));
    this.rim = scene.add
      .rectangle(0, 0, 1, 1)
      .setOrigin(0.5, 0)
      .setVisible(false);
    this.cannons = [0, 1].map(() =>
      scene.add.image(0, 0, ATLAS, FRAMES.cannon).setVisible(false),
    );
    layer.add([this.body, ...this.ends, this.rim, ...this.cannons]);
    this.refresh({ metrics, palette });
  }

  /** Takes up the frames again, once the atlas has been baked again, and sizes and paints the body and the rim to match. */
  refresh({ metrics, palette }: Readonly<Baked>): void {
    for (const end of this.ends) end.setFrame(FRAMES.paddle);
    for (const cannon of this.cannons) cannon.setFrame(FRAMES.cannon);
    this.body
      .setSize(1, Math.round(PADDLE_HEIGHT * metrics.unit))
      .setFillStyle(palette.paddle);
    this.rim.setSize(1, lineWidth(metrics)).setFillStyle(palette.mark);
  }

  /** Draws the paddle between its last place and its next, at its width, with what its mode adds. */
  draw({ field, alpha, metrics }: Readonly<PaintContext>): void {
    const { paddle, mode } = field;
    const x = toCanvasX(metrics, between(paddle.lastX, paddle.x, alpha));
    const top = toCanvasY(metrics, paddle.top);
    const width = Math.round(paddle.width * metrics.unit);
    const height = this.body.height;
    const span = Math.max(0, width - height);
    this.body.setPosition(x, top).setScale(span, 1);
    for (let i = 0; i < this.ends.length; i++) {
      this.ends[i]?.setPosition(
        x + (i === 0 ? -span : span) / 2,
        top + height / 2,
      );
    }
    this.rim
      .setVisible(mode === "catch")
      .setPosition(x, top + this.rim.height)
      .setScale(span, 1);
    const inset = width / 2 - BOLT_INSET * metrics.unit;
    for (let i = 0; i < this.cannons.length; i++) {
      const cannon = this.cannons[i];
      cannon
        ?.setVisible(mode === "laser")
        .setPosition(x + (i === 0 ? -inset : inset), top - cannon.height / 2);
    }
  }
}
