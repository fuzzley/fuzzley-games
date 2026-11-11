import type { GameObjects, Scene } from "phaser";
import type { Guide, GuidePlace } from "../../rules/flight/guide";
import { columnOf, fieldRowOf } from "../../rules/grid";
import { COLUMNS, MOST_DEPTH } from "../../rules/tuning";
import type { Wall } from "../../rules/wall/wall";
import { FRAMES } from "../../view/art/frames";
import {
  type FieldMetrics,
  type Place,
  toCanvas,
} from "../../view/field/field_metrics";
import { ATLAS } from "../atlas";
import { placeDot } from "./dots";
import type { PaintContext, Painter } from "./painter";

/**
 * The most dots the guide shows, `GUIDE_DOT_GAP` apart: about 72, along the
 * longest first segment a field has, from the floor to a far corner of the
 * deepest, about 24 units, and the most the debug menu runs the guide past
 * its first turn, 12, with room to spare.
 */
export const MOST_GUIDE_DOTS = 128;

/** The most bricks the guide outlines: as many cells as a straight line crosses on the deepest field. */
export const MOST_PUNCHED = MOST_DEPTH + COLUMNS;

/** The dots of no guide. */
const NO_DOTS: readonly GuidePlace[] = [];

/** The cells of no guide. */
const NO_CELLS: readonly number[] = [];

/**
 * Says whether a dot would crowd the jump line's count, which the guide's
 * dots keep clear of.
 *
 * The guide asks as it draws, so the count must be drawn for the frame first,
 * and change only with the wall, the depth or the layout, which a guide
 * that shows draws again on; one hidden asks nothing.
 */
export interface CountClearance {
  /** Returns whether a dot some device pixels wide about a place on the canvas would crowd a dot of the jump line's count. */
  crowdsCount(x: number, y: number, side: number): boolean;
}

/**
 * Draws the guide: a dot at each of its places, on whole pixels, but where
 * it would crowd the jump line's count, and an outline round each brick the
 * shot would punch through, each from a pool made once, the rest hidden. It
 * draws them again only as the guide changes, or the wall or the layout
 * under a guide shown.
 */
export class GuidePainter implements Painter {
  /** A dot for each place the guide may show, made once. */
  readonly dots: readonly GameObjects.Image[];
  /** An outline for each brick the guide may show punched through, made once. */
  readonly punches: readonly GameObjects.Image[];
  /** The guide, the wall and the layout it was last drawn for. */
  private drawn: {
    guide: Guide | null;
    wall: Wall | null;
    metrics: FieldMetrics | null;
    depth: number;
  } = { guide: null, wall: null, metrics: null, depth: 0 };
  /** Where a dot or an outline is drawn, written for each. */
  private readonly place: Place = { x: 0, y: 0 };

  constructor(
    scene: Scene,
    layer: GameObjects.Layer,
    private readonly countClearance: CountClearance,
  ) {
    this.punches = Array.from({ length: MOST_PUNCHED }, () =>
      scene.add.image(0, 0, ATLAS, FRAMES.guidePunch).setVisible(false),
    );
    this.dots = Array.from({ length: MOST_GUIDE_DOTS }, () =>
      scene.add.image(0, 0, ATLAS, FRAMES.guideDot).setVisible(false),
    );
    layer.add([...this.punches, ...this.dots]);
  }

  /**
   * Draws the guide the frame hands over, or hides it where none shows: a
   * guide hidden stays hidden however the wall or the layout changes under
   * it, as a flight's wall does.
   */
  draw({ view, guide, shape, metrics, baked }: Readonly<PaintContext>): void {
    const drawn = this.drawn;
    if (
      guide === drawn.guide &&
      (guide === null ||
        (view.wall === drawn.wall &&
          metrics === drawn.metrics &&
          shape.depth === drawn.depth))
    ) {
      return;
    }
    drawn.guide = guide;
    drawn.wall = view.wall;
    drawn.metrics = metrics;
    drawn.depth = shape.depth;
    const scale = metrics.unit / baked.unit;
    const dots = guide?.dots ?? NO_DOTS;
    let at = 0;
    for (const dot of this.dots) {
      const place = dots[at++];
      if (!place) {
        dot.setVisible(false);
        continue;
      }
      toCanvas(metrics, place.x, place.y, this.place);
      placeDot(dot, this.place.x, this.place.y, scale);
      dot.setVisible(
        !this.countClearance.crowdsCount(dot.x, dot.y, dot.displayWidth),
      );
    }
    const punched = guide?.punched ?? NO_CELLS;
    at = 0;
    for (const punch of this.punches) {
      const cell = punched[at++];
      if (cell === undefined) {
        punch.setVisible(false);
        continue;
      }
      // A brick the shot punches through stands in the field, but one
      // waiting over the ceiling, which a hot shot's guide may reach.
      const row = fieldRowOf(view.wall, cell);
      punch.setVisible(row < shape.depth);
      toCanvas(metrics, columnOf(cell) + 0.5, row + 0.5, this.place);
      punch.setPosition(this.place.x, this.place.y).setScale(scale);
    }
  }
}
