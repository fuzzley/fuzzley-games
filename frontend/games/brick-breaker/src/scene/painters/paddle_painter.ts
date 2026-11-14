import { lerp } from "@fz/core/math";
import type { GameObjects, Scene } from "phaser";
import { BOLT_INSET } from "../../rules/tuning";
import {
  MOST_HOOKS,
  PADDLE_FRAMES,
  type PaddleShape,
  hookCount,
  paddleShape,
} from "../../view/art/paddle_art";
import type { BricksPalette } from "../../view/colors/palette";
import {
  type FieldMetrics,
  toCanvasX,
  toCanvasY,
} from "../../view/field/field_metrics";
import { ATLAS } from "../atlas";
import type { Baked, PaintContext, Painter } from "./painter";

/**
 * Draws the paddle as the art kit does at any width: its lip, a cap at each
 * end, its body between the caps and its pad along its top, with a catching
 * paddle's velcro hooks along its top or a laser's cannons over its ends.
 *
 * The ends, the hooks and the cannons are frames of the atlas, which keep
 * their shape; the lip, the body and the pad are rectangles a pixel wide,
 * scaled across, which draw crisp at any width on either of Phaser's
 * renderers.
 */
export class PaddlePainter implements Painter {
  /** Its lip, under its bar, from the middle of one cap to the other. */
  readonly lip: GameObjects.Rectangle;
  /** Its ends, left and right, each a cap over its lip; the right one flipped. */
  readonly ends: readonly GameObjects.Image[];
  /** Its body, over the caps' inner halves. */
  readonly body: GameObjects.Rectangle;
  /** Its pad, along its body's top. */
  readonly pad: GameObjects.Rectangle;
  /** A catching paddle's velcro hooks, as many as stand along its body, the rest hidden. */
  readonly hooks: readonly GameObjects.Image[];
  /** A laser's cannons, left and right. */
  readonly cannons: readonly GameObjects.Image[];
  /** How its parts lie at the unit the atlas was baked at. */
  private shape: PaddleShape;

  /** Makes the paddle at the field's scale, in the palette. */
  constructor(
    scene: Scene,
    layer: GameObjects.Layer,
    metrics: FieldMetrics,
    palette: BricksPalette,
  ) {
    this.shape = paddleShape(metrics);
    this.lip = scene.add.rectangle(0, 0, 1, 1).setOrigin(0.5, 0);
    this.ends = [false, true].map((right) =>
      scene.add.image(0, 0, ATLAS, PADDLE_FRAMES.end).setFlipX(right),
    );
    this.body = scene.add.rectangle(0, 0, 1, 1).setOrigin(0.5, 0);
    this.pad = scene.add.rectangle(0, 0, 1, 1).setOrigin(0.5, 0);
    this.hooks = Array.from({ length: MOST_HOOKS }, () =>
      scene.add.image(0, 0, ATLAS, PADDLE_FRAMES.hook).setVisible(false),
    );
    this.cannons = [0, 1].map(() =>
      scene.add.image(0, 0, ATLAS, PADDLE_FRAMES.cannon).setVisible(false),
    );
    layer.add([
      this.lip,
      ...this.ends,
      this.body,
      this.pad,
      ...this.hooks,
      ...this.cannons,
    ]);
    this.refresh({ metrics, palette });
  }

  /**
   * Sizes the lip, the body and the pad at the unit the atlas was baked at,
   * and paints them in its palette, so they match the ends.
   */
  refresh({ metrics, palette }: Readonly<Baked>): void {
    this.shape = paddleShape(metrics);
    const { bar, pad } = this.shape;
    this.lip.setSize(1, bar).setFillStyle(palette.paddleInks.lip);
    this.body.setSize(1, bar).setFillStyle(palette.paddle);
    this.pad.setSize(1, pad.height).setFillStyle(palette.paddleInks.pad);
  }

  /** Draws the paddle between its last place and its next, at its width, with what its mode adds. */
  draw({ field, alpha, metrics }: Readonly<PaintContext>): void {
    const { paddle, mode } = field;
    const x = toCanvasX(metrics, lerp(paddle.lastX, paddle.x, alpha));
    const top = toCanvasY(metrics, paddle.top);
    const width = Math.round(paddle.width * metrics.unit);
    this.placeBar(x, top, width);
    this.placePad(x, top, width);
    this.placeHooks(x, top, width, mode === "catch");
    this.placeCannons(
      x,
      top,
      width / 2 - BOLT_INSET * metrics.unit,
      mode === "laser",
    );
  }

  /** Puts the lip, the caps and the body at a width, their middle at `x` and the bar's top at `top`. */
  private placeBar(x: number, top: number, width: number): void {
    const { bar, lip, inner } = this.shape;
    const between = Math.max(0, width - bar);
    this.lip.setPosition(x, top + lip).setScale(between, 1);
    for (let i = 0; i < this.ends.length; i++) {
      this.ends[i]?.setPosition(
        x + (i === 0 ? -between : between) / 2,
        top + bar / 2,
      );
    }
    this.body.setPosition(x, top).setScale(Math.max(0, width - 2 * inner), 1);
  }

  /** Puts the pad along the body's top, short of its ends. */
  private placePad(x: number, top: number, width: number): void {
    const { inner, pad } = this.shape;
    this.pad
      .setPosition(x, top + pad.top)
      .setScale(Math.max(0, width - 2 * (inner + pad.inset)), 1);
  }

  /** Stands as many hooks as fit along the body's top about its middle, while it catches, and hides the rest. */
  private placeHooks(
    x: number,
    top: number,
    width: number,
    catching: boolean,
  ): void {
    const count = catching ? hookCount(width, this.shape) : 0;
    const { pitch } = this.shape.hooks;
    for (let i = 0; i < this.hooks.length; i++) {
      this.hooks[i]
        ?.setVisible(i < count)
        .setPosition(x + (i - (count - 1) / 2) * pitch, top);
    }
  }

  /** Stands a cannon `inset` either side of the middle, on the paddle's top, while it fires. */
  private placeCannons(
    x: number,
    top: number,
    inset: number,
    firing: boolean,
  ): void {
    for (let i = 0; i < this.cannons.length; i++) {
      this.cannons[i]
        ?.setVisible(firing)
        .setPosition(x + (i === 0 ? -inset : inset), top);
    }
  }
}
