import type { GameObjects, Scene } from "phaser";
import type { Place, Torus } from "../../rules/torus";
import { FRAMES } from "../../view/art/art";
import { CONSTELLATION } from "../../view/art/pilot_art";
import type { BeltPalette } from "../../view/colors/palette";
import type { FieldMetrics } from "../../view/field/field_metrics";
import {
  CONSTELLATION_SIZE,
  MOST_SPECKS,
  speckCount,
  speckShares,
} from "../../view/field/specks";
import { ATLAS } from "../atlas";
import type { PaintContext, Painter } from "./painter";

/**
 * Draws the field under everything: the specks strewn over it from the
 * run's seed, still, an Endless wave's constellation among them, and the
 * frame round it, which the deck's camera draws, so it stays still as the
 * field shakes; each drawn again only once the layout, the palette, the
 * field's size, the run or the constellation changed.
 */
export class FieldPainter implements Painter {
  /** A speck for as many as the largest field holds, made once. */
  readonly specks: readonly GameObjects.Image[];
  /** The constellation's specks, then its eyes, made once. */
  readonly stars: readonly GameObjects.Image[];
  /** The frame round the field. */
  readonly frame: GameObjects.Graphics;

  private metrics: FieldMetrics | null = null;
  private palette: BeltPalette | null = null;
  private torus: Torus | null = null;
  private seed = Number.NaN;
  private constellation: Readonly<Place> | null = null;
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
    this.stars = Array.from(
      { length: CONSTELLATION.specks.length + CONSTELLATION.eyes.length },
      () => scene.add.image(0, 0, ATLAS, FRAMES.speck).setVisible(false),
    );
    layers.field.add([...this.specks, ...this.stars]);
    this.frame = scene.add.graphics();
    layers.frame.add(this.frame);
  }

  /** Draws the specks, the constellation and the frame where the metrics put the field, in a palette; again only once one of them changed. */
  draw(context: Readonly<PaintContext>): void {
    const { field, metrics, palette, seed, constellation, zoom } = context;
    const { torus } = field;
    if (
      metrics === this.metrics &&
      palette === this.palette &&
      torus === this.torus &&
      seed === this.seed &&
      constellation === this.constellation
    ) {
      return;
    }
    if (seed !== this.seed) this.shares = speckShares(seed);
    this.metrics = metrics;
    this.palette = palette;
    this.torus = torus;
    this.seed = seed;
    this.constellation = constellation;
    this.drawStars(constellation, metrics, palette, zoom);
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

  /**
   * Draws the constellation's specks as the field's, its eyes brighter,
   * its middle where the frame lays it and its shape the fuzzball's,
   * whatever the field's shape; or hides it, for a wave that has none.
   */
  private drawStars(
    constellation: Readonly<Place> | null,
    metrics: FieldMetrics,
    palette: BeltPalette,
    zoom: number,
  ): void {
    const places = [...CONSTELLATION.specks, ...CONSTELLATION.eyes];
    const across = CONSTELLATION_SIZE * metrics.unit;
    for (const [i, star] of this.stars.entries()) {
      const place = places[i];
      star.setVisible(constellation !== null);
      if (!constellation || !place) continue;
      star
        .setPosition(
          metrics.x + constellation.x * metrics.width + place.x * across,
          metrics.y + constellation.y * metrics.height + place.y * across,
        )
        .setScale(zoom)
        .setTint(
          i < CONSTELLATION.specks.length ? palette.speck : palette.muted,
        );
    }
  }
}
