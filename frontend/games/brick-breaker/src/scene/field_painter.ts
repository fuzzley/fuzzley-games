import type { GameObjects, Scene } from "phaser";
import { NET_DEPTH, PADDLE_TOP } from "../rules/tuning";
import { type FieldMetrics, toCanvasY } from "../view/field_metrics";
import type { BricksPalette } from "../view/palette";
import { lineWidth } from "../view/shapes";
import type { PaintContext, Painter } from "./painter";

/** Draws the field, its wall on the left, the top and the right, and the net while there is one. */
export class FieldPainter implements Painter {
  readonly graphics: GameObjects.Graphics;
  private metrics: FieldMetrics | null = null;
  private palette: BricksPalette | null = null;
  private net = false;

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.graphics = scene.add.graphics();
    layer.add(this.graphics);
  }

  /** Draws the field where the metrics put it, in a palette, with the net or without; again only once one of them changed. */
  draw({ field, metrics, palette }: Readonly<PaintContext>): void {
    const { net } = field;
    if (
      metrics === this.metrics &&
      palette === this.palette &&
      net === this.net
    ) {
      return;
    }
    this.metrics = metrics;
    this.palette = palette;
    this.net = net;
    const { x, y, width, height, wall } = metrics;
    const graphics = this.graphics.clear();
    graphics.fillStyle(palette.field);
    graphics.fillRect(x, y, width, height);
    graphics.fillStyle(palette.wall);
    graphics.fillRect(x - wall, y - wall, width + 2 * wall, wall);
    graphics.fillRect(x - wall, y, wall, height);
    graphics.fillRect(x + width, y, wall, height);
    if (net) {
      graphics.fillStyle(palette.capsules.good);
      graphics.fillRect(
        x,
        Math.round(toCanvasY(metrics, PADDLE_TOP + NET_DEPTH)),
        width,
        lineWidth(metrics),
      );
    }
  }
}
