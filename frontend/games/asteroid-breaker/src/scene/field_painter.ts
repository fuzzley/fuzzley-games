import type { GameObjects, Scene } from "phaser";
import type { Place, Torus } from "../rules/torus";
import { FRAMES } from "../view/art";
import type { FieldMetrics } from "../view/field_metrics";
import type { BeltPalette } from "../view/palette";
import { MOST_SPECKS, speckCount, speckShares } from "../view/specks";
import { ATLAS } from "./atlas";
import type { PaintContext, Painter } from "./painter";

/**
 * Draws the field under everything: the specks strewn over it from the
 * run's seed, still, and the frame round it, which the deck's camera draws,
 * so it stays still as the field shakes; each drawn again only once the
 * layout, the palette, the field's size or the run changed.
 */
export class FieldPainter implements Painter {
  /** A speck for as many as the largest field holds, made once. */
  readonly specks: readonly GameObjects.Image[];
  /** The frame round the field. */
  readonly frame: GameObjects.Graphics;

  private metrics: FieldMetrics | null = null;
  private palette: BeltPalette | null = null;
  private torus: Torus | null = null;
  private seed = Number.NaN;
  /** Where the run's specks lie, as shares of the field's width and height. */
  private shares: readonly Place[] = [];

  constructor(
    scene: Scene,
    layers: {
      readonly field: GameObjects.Layer;
      readonly frame: GameObjects.Layer;
    },
  ) {
    this.specks = Array.from({ length: MOST_SPECKS }, () =>
      scene.add.image(0, 0, ATLAS, FRAMES.speck).setVisible(false),
    );
    layers.field.add([...this.specks]);
    this.frame = scene.add.graphics();
    layers.frame.add(this.frame);
  }

  /** Takes up each speck's frame again, once the atlas has been baked again. */
  refresh(): void {
    for (const speck of this.specks) speck.setFrame(FRAMES.speck);
  }

  /** Draws the specks and the frame where the metrics put the field, in a palette; again only once one of them changed. */
  draw({ field, metrics, palette, seed, zoom }: Readonly<PaintContext>): void {
    const { torus } = field;
    if (
      metrics === this.metrics &&
      palette === this.palette &&
      torus === this.torus &&
      seed === this.seed
    ) {
      return;
    }
    if (seed !== this.seed) this.shares = speckShares(seed);
    this.metrics = metrics;
    this.palette = palette;
    this.torus = torus;
    this.seed = seed;
    const shown = speckCount(torus);
    for (let i = 0; i < this.specks.length; i++) {
      const speck = this.specks[i];
      const share = this.shares[i];
      if (!speck || !share) continue;
      speck.setVisible(i < shown);
      speck
        .setPosition(
          metrics.x + share.x * metrics.width,
          metrics.y + share.y * metrics.height,
        )
        .setScale(zoom)
        .setTint(palette.speck);
    }
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
