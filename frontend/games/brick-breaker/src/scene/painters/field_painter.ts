import { lineWidth, widthOf } from "@fz/phaser/shapes";
import type { GameObjects, Scene } from "phaser";
import { NET_DEPTH, PADDLE_HEIGHT } from "../../rules/tuning";
import type { BricksPalette } from "../../view/colors/palette";
import { type FieldMetrics, toCanvasY } from "../../view/field/field_metrics";
import { RIM, rimWidth } from "../../view/field/rim";
import type { PaintContext, Painter } from "./painter";

/** How far below the paddle's foot the gutter starts, in field units. */
const GUTTER_GAP = 0.45;

/**
 * The gutter's chevrons, pointing down, as the art kit draws them: how far
 * apart, in field units, the first half that from the left; how far either
 * side of its point each reaches and how far down it starts and points;
 * and how wide its line is.
 */
const CHEVRON = {
  pitch: 2,
  half: 0.28,
  top: 0.38,
  point: 0.62,
  width: 0.09,
} as const;

/**
 * Draws the field: the rim round it on the left, the top and the right, a
 * lip at its foot, the gutter under the paddle with chevrons pointing down
 * it, and the net while there is one.
 */
export class FieldPainter implements Painter {
  readonly graphics: GameObjects.Graphics;
  private metrics: FieldMetrics | null = null;
  private palette: BricksPalette | null = null;
  private net = false;
  private paddleTop = 0;

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.graphics = scene.add.graphics();
    layer.add(this.graphics);
  }

  /**
   * Draws the field where the metrics put it, in a palette, its gutter
   * under the paddle, with the net or without; again only once one of them
   * changed.
   */
  draw({ field, metrics, palette }: Readonly<PaintContext>): void {
    const { net } = field;
    const paddleTop = field.paddle.top;
    if (
      metrics === this.metrics &&
      palette === this.palette &&
      net === this.net &&
      paddleTop === this.paddleTop
    ) {
      return;
    }
    this.metrics = metrics;
    this.palette = palette;
    this.net = net;
    this.paddleTop = paddleTop;
    const graphics = this.graphics.clear();
    this.drawRim(graphics, metrics, palette);
    graphics.fillStyle(palette.field);
    graphics.fillRect(metrics.x, metrics.y, metrics.width, metrics.height);
    this.drawGutter(graphics, metrics, palette, paddleTop);
    if (net) {
      graphics.fillStyle(palette.capsules.good);
      graphics.fillRect(
        metrics.x,
        Math.round(toCanvasY(metrics, paddleTop + NET_DEPTH)),
        metrics.width,
        lineWidth(metrics),
      );
    }
  }

  /**
   * Draws the rim round the field, on its left, its top and its right,
   * round at its outer corners, its lip showing at the foot of each side;
   * the field, drawn over it, hides its inside.
   */
  private drawRim(
    graphics: GameObjects.Graphics,
    metrics: FieldMetrics,
    palette: BricksPalette,
  ): void {
    const rim = rimWidth(metrics);
    const { x, y, width, height } = metrics;
    const corner = RIM.corner * rim;
    graphics.fillStyle(palette.fieldInks.rimLip);
    graphics.fillRoundedRect(
      x - rim,
      y - rim,
      width + 2 * rim,
      height + rim,
      corner,
    );
    graphics.fillStyle(palette.wall);
    graphics.fillRoundedRect(
      x - rim,
      y - rim,
      width + 2 * rim,
      height + rim - Math.round(RIM.lip * rim),
      corner,
    );
  }

  /** Draws the gutter from under the paddle to the field's foot, a chevron pointing down it every pitch across. */
  private drawGutter(
    graphics: GameObjects.Graphics,
    metrics: FieldMetrics,
    palette: BricksPalette,
    paddleTop: number,
  ): void {
    const { x, y, width, height, unit } = metrics;
    const top = Math.round(
      toCanvasY(metrics, paddleTop + PADDLE_HEIGHT + GUTTER_GAP),
    );
    graphics.fillStyle(palette.fieldInks.gutter);
    graphics.fillRect(x, top, width, y + height - top);
    graphics.lineStyle(
      widthOf(CHEVRON.width, metrics),
      palette.fieldInks.chevron,
    );
    for (
      let middle = x + (CHEVRON.pitch / 2) * unit;
      middle < x + width;
      middle += CHEVRON.pitch * unit
    ) {
      graphics
        .beginPath()
        .moveTo(middle - CHEVRON.half * unit, top + CHEVRON.top * unit)
        .lineTo(middle, top + CHEVRON.point * unit)
        .lineTo(middle + CHEVRON.half * unit, top + CHEVRON.top * unit)
        .strokePath();
    }
  }
}
