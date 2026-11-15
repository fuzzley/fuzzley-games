import type { GameObjects, Scene } from "phaser";
import type { BeltPalette } from "../../view/colors/palette";
import type { FieldMetrics } from "../../view/field/field_metrics";
import type { PaintContext, Painter } from "./painter";

/**
 * Draws the frame round the field, which the deck's camera draws, so it
 * stays still as the field shakes; again only once the layout or the
 * palette changed.
 */
export class FieldPainter implements Painter {
  /** The frame round the field. */
  readonly frame: GameObjects.Graphics;

  private metrics: FieldMetrics | null = null;
  private palette: BeltPalette | null = null;

  constructor(scene: Scene, layers: { readonly frame: GameObjects.Layer }) {
    this.frame = scene.add.graphics();
    layers.frame.add(this.frame);
  }

  /** Draws the frame where the metrics put the field, in a palette's line; again only once one of them changed. */
  draw({ metrics, palette }: Readonly<PaintContext>): void {
    if (metrics === this.metrics && palette === this.palette) return;
    this.metrics = metrics;
    this.palette = palette;
    const { x, y, width, height, frame: thick } = metrics;
    this.frame
      .clear()
      .fillStyle(palette.line)
      .fillRect(x - thick, y - thick, width + 2 * thick, thick)
      .fillRect(x - thick, y + height, width + 2 * thick, thick)
      .fillRect(x - thick, y, thick, height)
      .fillRect(x + width, y, thick, height);
  }
}
