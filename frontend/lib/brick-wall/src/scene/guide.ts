// A wall game's guide: where a shot would fly, as dots along its path, a
// ring at each turn where a game rings them, and a mark on each brick the
// shot would strike.

import type { GameObjects, Scene } from "phaser";
import { COLUMNS, MOST_DEPTH } from "../rules/field";
import { columnOf, fieldRowOf } from "../rules/grid";
import type { Wall } from "../rules/wall";
import { type FieldMetrics, type Place, toCanvas } from "../view/field_metrics";
import type { GuideDot, GuidePlace, WallGuide } from "../view/guide";
import { ATLAS } from "./atlas";
import {
  type PaintContext,
  type Painter,
  type WallView,
  placeDot,
} from "./painter";

/** The most bricks the guide marks: as many cells as a straight line crosses on the deepest field. */
export const MOST_STRUCK = MOST_DEPTH + COLUMNS;

/** Says which of a game's frames the guide shows, and the most dots it shows. */
export interface GuideArt {
  /** The frame of a dot. */
  readonly dot: string;
  /** The most dots a guide shows, which are made once. */
  readonly mostDots: number;
  /** The frame over a brick the shot would strike, a cell's. */
  readonly struck: string;
  /** The frame of the ring at a turn, and the most turns a guide rings: left out by a game that rings none. */
  readonly turns?: { readonly ring: string; readonly most: number };
}

/** Says what a frame of a wall game's guide is drawn from: what every painter's is, and the guide, or null where none shows. */
export interface GuideContext<K extends string> extends PaintContext<
  WallView<K>
> {
  guide: WallGuide | null;
}

/**
 * Says whether a dot would crowd the jump line's count, which the guide's
 * dots keep clear of, as the field's painter says.
 *
 * The guide asks as it draws, so the count must be drawn for the frame
 * first, and change only with the wall, the depth or the layout, which a
 * guide that shows draws again on; one hidden asks nothing.
 */
export interface CountClearance {
  /** Returns whether a dot some device pixels wide about a place on the canvas would crowd a dot of the jump line's count. */
  crowdsCount(x: number, y: number, side: number): boolean;
}

/** The dots of no guide. */
const NO_DOTS: readonly GuideDot[] = [];

/** The places of no guide. */
const NO_PLACES: readonly GuidePlace[] = [];

/** The cells of no guide. */
const NO_CELLS: readonly number[] = [];

/**
 * Draws a wall game's guide: a dot at each of its places, on whole pixels,
 * as strongly as each shows, but where it would crowd the jump line's
 * count; a ring at each turn, where the game rings them; and a mark over
 * each brick the shot would strike, each from a pool made once, the rest
 * hidden, and its layer hidden whole while no guide shows, so a frame then
 * goes through none of them. It draws them again only as the guide changes,
 * or the wall or the layout under a guide shown.
 */
export class GuidePainter<K extends string> implements Painter<
  GuideContext<K>
> {
  /** A dot for each place the guide may show, made once. */
  readonly dots: readonly GameObjects.Image[];
  /** A ring for each turn the guide may ring, made once: none where the game rings none. */
  readonly rings: readonly GameObjects.Image[];
  /** A mark for each brick the guide may show struck, made once. */
  readonly marks: readonly GameObjects.Image[];
  /** The guide, the wall and the layout it was last drawn for. */
  private readonly drawn: {
    guide: WallGuide | null;
    wall: Wall<K> | null;
    metrics: FieldMetrics | null;
    depth: number;
  } = { guide: null, wall: null, metrics: null, depth: 0 };
  /** Where a dot, a ring or a mark is drawn, written for each. */
  private readonly place: Place = { x: 0, y: 0 };

  constructor(
    scene: Scene,
    private readonly layer: GameObjects.Layer,
    art: GuideArt,
    private readonly countClearance: CountClearance,
  ) {
    this.marks = Array.from({ length: MOST_STRUCK }, () =>
      scene.add.image(0, 0, ATLAS, art.struck).setVisible(false),
    );
    const { turns } = art;
    this.rings = turns
      ? Array.from({ length: turns.most }, () =>
          scene.add.image(0, 0, ATLAS, turns.ring).setVisible(false),
        )
      : [];
    this.dots = Array.from({ length: art.mostDots }, () =>
      scene.add.image(0, 0, ATLAS, art.dot).setVisible(false),
    );
    layer.add([...this.marks, ...this.rings, ...this.dots]);
    // As no guide is drawn yet.
    layer.setVisible(false);
  }

  /**
   * Draws the guide the frame hands over, or hides it where none shows: a
   * guide hidden stays hidden however the wall or the layout changes under
   * it, as a flight's wall does.
   */
  draw({
    view,
    guide,
    shape,
    metrics,
    baked,
  }: Readonly<GuideContext<K>>): void {
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
    this.layer.setVisible(guide !== null);
    drawn.wall = view.wall;
    drawn.metrics = metrics;
    drawn.depth = shape.depth;
    const scale = metrics.unit / baked.unit;
    this.drawDots(guide?.dots ?? NO_DOTS, metrics, scale);
    this.drawRings(guide?.turns ?? NO_PLACES, metrics, scale);
    const struck = guide?.struck ?? NO_CELLS;
    let at = 0;
    for (const mark of this.marks) {
      const cell = struck[at++];
      if (cell === undefined) {
        mark.setVisible(false);
        continue;
      }
      // A brick the shot strikes stands in the field, but one waiting over
      // the ceiling, which a guide may reach.
      const row = fieldRowOf(view.wall, cell);
      mark.setVisible(row < shape.depth);
      toCanvas(metrics, columnOf(cell) + 0.5, row + 0.5, this.place);
      mark.setPosition(this.place.x, this.place.y).setScale(scale);
    }
  }

  /** Draws a dot at each of a guide's places, as strongly as each shows, but where it would crowd the count, and hides the rest. */
  private drawDots(
    places: readonly GuideDot[],
    metrics: FieldMetrics,
    scale: number,
  ): void {
    let at = 0;
    for (const dot of this.dots) {
      const place = places[at++];
      if (!place) {
        dot.setVisible(false);
        continue;
      }
      toCanvas(metrics, place.x, place.y, this.place);
      placeDot(dot, this.place.x, this.place.y, scale).setAlpha(
        place.alpha ?? 1,
      );
      dot.setVisible(
        !this.countClearance.crowdsCount(dot.x, dot.y, dot.displayWidth),
      );
    }
  }

  /** Draws a ring at each of a guide's turns, and hides the rest. */
  private drawRings(
    turns: readonly GuidePlace[],
    metrics: FieldMetrics,
    scale: number,
  ): void {
    let at = 0;
    for (const ring of this.rings) {
      const turn = turns[at++];
      if (!turn) {
        ring.setVisible(false);
        continue;
      }
      toCanvas(metrics, turn.x, turn.y, this.place);
      ring.setPosition(this.place.x, this.place.y).setScale(scale);
      ring.setVisible(true);
    }
  }
}
