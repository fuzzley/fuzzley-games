import { clamp } from "@fz/core/math";
import { cssHex } from "@fz/phaser/color";
import type { GameObjects, Scene } from "phaser";
import type { Moving } from "../../rules/torus";
import type { BeltPalette } from "../../view/colors/palette";
import {
  fadeAlpha,
  pointsLabel,
  riseOf,
  shareDone,
} from "../../view/effects/flourish";
import { POINTS_MS } from "../../view/effects/timing";
import { toCanvas } from "../../view/field/field_metrics";
import type { FieldEvent } from "../../view/field/frame";
import type { PaintContext, Painter } from "./painter";
import { type Playing, Turns } from "./turns";

/** How many points may show at once: a blast scores a crowd of rocks at once. */
const POOL = 12;

/**
 * How tall the points are written, and how wide the stroke round them in the
 * field's color, in field units.
 */
const POINTS_TEXT = { size: 0.95, stroke: 0.28 } as const;

/** Describes points scored, showing from a time at the place they were scored. */
interface Scored extends Playing {
  readonly label: GameObjects.Text;
}

/**
 * Draws the points scored where they were scored, in the field's text,
 * stroked in its color so they read over whatever lies under them, rising
 * as they fade where motion is welcome, and kept whole inside the field.
 */
export class PointsPainter implements Painter {
  readonly scored: Turns<Scored>;

  /** The palette the labels were last written in, and the unit. */
  private styledIn: BeltPalette | null = null;
  private styledAt = 0;
  /** Where a label is on the canvas, written each frame. */
  private readonly at: Moving = { x: 0, y: 0 };

  constructor(scene: Scene, layer: GameObjects.Layer, fontFamily: string) {
    this.scored = new Turns(POOL, () => ({
      label: scene.add
        .text(0, 0, "", { fontFamily, fontStyle: "700" })
        .setOrigin(0.5)
        .setVisible(false),
      at: -Infinity,
      x: 0,
      y: 0,
    }));
    layer.add(this.scored.all.map(({ label }) => label));
  }

  /** Shows the points an event scored where it scored them. */
  show(event: Readonly<FieldEvent>, now: number): void {
    this.scored.play(event.x, event.y, now).label.setText(pointsLabel(event));
  }

  /** Hides every label, as a new field starts. */
  start(): void {
    for (const scored of this.scored.all) scored.at = -Infinity;
  }

  /** Moves each label on to the scene's time, rising and fading, or hides it once it is over. */
  draw({ metrics, palette, now, motion }: Readonly<PaintContext>): void {
    if (palette !== this.styledIn || metrics.unit !== this.styledAt) {
      this.style(palette, metrics.unit);
    }
    for (const { label, at, x, y } of this.scored.all) {
      const done = shareDone(at, now, POINTS_MS);
      label.setVisible(done < 1);
      if (done === 1) continue;
      toCanvas(metrics, x, y - riseOf(done, motion), this.at);
      label
        .setPosition(
          within(this.at.x, label.width, metrics.x, metrics.width),
          within(this.at.y, label.height, metrics.y, metrics.height),
        )
        .setAlpha(fadeAlpha(done));
    }
  }

  /** Writes every label in a palette's colors, at a unit's size. */
  private style(palette: BeltPalette, unit: number): void {
    this.styledIn = palette;
    this.styledAt = unit;
    const color = cssHex(palette.shot);
    const stroke = cssHex(palette.outline);
    for (const { label } of this.scored.all) {
      label
        .setFontSize(POINTS_TEXT.size * unit)
        .setColor(color)
        .setStroke(stroke, POINTS_TEXT.stroke * unit);
    }
  }
}

/**
 * Returns where a label's middle lies along an axis, moved in from an edge so
 * all of it, so long, lies within a span from a start.
 */
function within(
  middle: number,
  length: number,
  start: number,
  span: number,
): number {
  return clamp(middle, start + length / 2, start + span - length / 2);
}
