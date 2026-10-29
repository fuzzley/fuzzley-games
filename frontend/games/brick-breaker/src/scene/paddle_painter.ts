import type { GameObjects, Scene } from "phaser";
import type { PaddleMode } from "../rules/catalog/capsules";
import type { Paddle } from "../rules/paddle";
import { BOLT_INSET, PADDLE_TOP } from "../rules/tuning";
import { FRAMES } from "../view/art";
import { type FieldMetrics, toCanvasX, toCanvasY } from "../view/field_metrics";
import { between } from "../view/frame";
import { ATLAS } from "./atlas";

/**
 * Draws the paddle, as a nine-slice that keeps its rounded ends as its width
 * changes, with a laser's cannons over its ends or a catching paddle's rim
 * along its top.
 */
export class PaddlePainter {
  readonly paddle: GameObjects.NineSlice;
  readonly cannons: readonly GameObjects.Image[];
  readonly rim: GameObjects.Image;

  /** Makes the paddle, its ends as wide as the atlas's paddle frame keeps whole. */
  constructor(scene: Scene, layer: GameObjects.Layer, ends: number) {
    this.paddle = scene.add.nineslice(
      0,
      0,
      ATLAS,
      FRAMES.paddle,
      2 * ends,
      0,
      ends,
      ends,
      0,
      0,
    );
    this.cannons = [0, 1].map(() =>
      scene.add.image(0, 0, ATLAS, FRAMES.cannon).setVisible(false),
    );
    this.rim = scene.add.image(0, 0, ATLAS, FRAMES.rim).setVisible(false);
    layer.add([this.paddle, ...this.cannons, this.rim]);
  }

  /** Takes up the frames again, once the atlas has been baked again, with the paddle's ends' new width. */
  refresh(ends: number): void {
    this.paddle.setTexture(ATLAS, FRAMES.paddle);
    this.paddle.setSlices(this.paddle.width, 0, ends, ends, 0, 0);
    for (const cannon of this.cannons) cannon.setFrame(FRAMES.cannon);
    this.rim.setFrame(FRAMES.rim);
  }

  /** Draws the paddle between its last place and its next, at its width, with what its mode adds. */
  draw(
    paddle: Readonly<Paddle>,
    mode: PaddleMode | null,
    alpha: number,
    metrics: FieldMetrics,
  ): void {
    const x = toCanvasX(metrics, between(paddle.lastX, paddle.x, alpha));
    const top = toCanvasY(metrics, PADDLE_TOP);
    const width = Math.round(paddle.width * metrics.unit);
    if (this.paddle.width !== width) this.paddle.width = width;
    this.paddle.setPosition(x, top + this.paddle.height / 2);
    const inset = width / 2 - BOLT_INSET * metrics.unit;
    this.cannons.forEach((cannon, i) => {
      cannon
        .setVisible(mode === "laser")
        .setPosition(x + (i === 0 ? -inset : inset), top - cannon.height / 2);
    });
    this.rim
      .setVisible(mode === "catch")
      .setPosition(x, top + this.rim.height / 2)
      .setScale((width - this.paddle.height) / this.rim.frame.width, 1);
  }
}
