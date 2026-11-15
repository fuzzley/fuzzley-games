import { lerp } from "@fz/core/math";
import type { GameObjects, Scene } from "phaser";
import { COMET_RECORDS } from "../../rules/hazards/comets";
import type { Moving } from "../../rules/torus";
import { FIELD_LONGEST_SIDE, FIELD_SHORT_SIDE } from "../../rules/tuning";
import {
  COMET_FRAMES,
  DASH_RUN,
  LANE,
  LANE_DASH_ALPHA,
  TAIL_BEHIND,
  laneWashAlpha,
  warningFrame,
} from "../../view/art/things";
import { toCanvas } from "../../view/field/field_metrics";
import {
  type ChevronLit,
  chevronLit,
  laneLength,
  tailShare,
  warningAt,
} from "../../view/field/warning";
import { ATLAS, ROCK_ATLAS } from "../atlas";
import type { PaintContext, Painter } from "./painter";

/**
 * How many runs of a lane's dashes a comet's lane holds at most: enough to
 * cross the largest field corner to corner.
 */
const MOST_DASH_RUNS = Math.ceil(
  (Math.hypot(FIELD_LONGEST_SIDE, FIELD_SHORT_SIDE) - LANE.dashesFrom) /
    DASH_RUN,
);

/**
 * Draws the comets: each crossing the field, turned the way it flies, its
 * head lit as the rocks are, its glowing edge over it and its tail behind
 * it, fading as it lies off the field; and each warned of at the edge it
 * will come in by, its chevrons lighting in turn, with its lane across the
 * field. Their halos are the halo painter's.
 *
 * A comet crosses rather than wraps, so it is drawn once, and the field's
 * camera cuts it off as it comes in and leaves.
 */
export class HazardPainter implements Painter {
  /** Each record's comet's lane's wash. */
  readonly lanes: readonly GameObjects.Image[];
  /** Each record's comet's lane's dashes, a run each, laid end to end from the edge in. */
  readonly dashes: readonly (readonly GameObjects.Image[])[];
  /** Each record's comet's tail. */
  readonly tails: readonly GameObjects.Image[];
  /** Each record's comet's head, lit. */
  readonly comets: readonly GameObjects.Image[];
  /** Each record's comet's glowing edge. */
  readonly edges: readonly GameObjects.Image[];
  /** Each record's warning. */
  readonly warnings: readonly GameObjects.Image[];

  /** Where a comet is drawn on the field, or where its warning stands, written each frame. */
  private readonly drawn: Moving = { x: 0, y: 0 };
  /** Where a comet or a part of it is on the canvas, written each frame. */
  private readonly at: Moving = { x: 0, y: 0 };

  /**
   * Makes each record's images: its comet's and its warning's in a layer,
   * and its lane's in one under all that lies on the field.
   */
  constructor(
    scene: Scene,
    layer: GameObjects.Layer,
    lanesLayer: GameObjects.Layer,
  ) {
    const images = (frame: string, atlas = ATLAS): GameObjects.Image[] =>
      Array.from({ length: COMET_RECORDS }, () =>
        scene.add.image(0, 0, atlas, frame).setVisible(false),
      );
    this.lanes = images(COMET_FRAMES.lane);
    this.dashes = Array.from({ length: COMET_RECORDS }, () =>
      Array.from({ length: MOST_DASH_RUNS }, () =>
        scene.add.image(0, 0, ATLAS, COMET_FRAMES.dashes).setVisible(false),
      ),
    );
    this.tails = images(COMET_FRAMES.tail);
    this.comets = images(COMET_FRAMES.head, ROCK_ATLAS);
    for (const head of this.comets) head.setLighting(true);
    this.edges = images(COMET_FRAMES.edge);
    this.warnings = images(warningFrame(null));
    lanesLayer.add([...this.lanes, ...this.dashes.flat()]);
    layer.add([...this.tails, ...this.comets, ...this.edges, ...this.warnings]);
  }

  /**
   * Draws each comet crossing between its last place and its next, and each
   * warned of at its edge, with its lane.
   */
  draw(context: Readonly<PaintContext>): void {
    const { field, alpha } = context;
    for (let i = 0; i < COMET_RECORDS; i++) {
      const comet = field.comets.slots[i];
      const live = comet?.live === true;
      const warned = live && comet.warnSteps > 0;
      if (live && !warned) {
        this.drawn.x = lerp(comet.lastX, comet.x, alpha);
        this.drawn.y = lerp(comet.lastY, comet.y, alpha);
        this.drawComet(i, comet.heading, context);
      } else {
        this.hideComet(i);
      }
      if (warned) {
        warningAt(comet, field.torus, this.drawn);
        this.drawWarning(
          i,
          comet.heading,
          chevronLit(comet, context.motion),
          context,
        );
      } else {
        this.hideWarning(i);
      }
    }
  }

  /** Draws a record's comet where it is drawn on the field, flying a way, its tail as strongly as it shows there. */
  private drawComet(
    i: number,
    heading: number,
    { field, metrics, zoom }: Readonly<PaintContext>,
  ): void {
    toCanvas(metrics, this.drawn.x, this.drawn.y, this.at);
    for (const image of [this.comets[i], this.edges[i]]) {
      image
        ?.setPosition(this.at.x, this.at.y)
        .setRotation(heading)
        .setScale(zoom)
        .setVisible(true);
    }
    const tail = this.tails[i];
    const share = tailShare(this.drawn, field.torus);
    toCanvas(
      metrics,
      this.drawn.x - Math.cos(heading) * TAIL_BEHIND,
      this.drawn.y - Math.sin(heading) * TAIL_BEHIND,
      this.at,
    );
    tail
      ?.setPosition(this.at.x, this.at.y)
      .setRotation(heading)
      .setScale(zoom)
      .setAlpha(share)
      .setVisible(share > 0);
  }

  /**
   * Draws a record's warning where it stands on the field's edge, pointing
   * in, a chevron lit or all held still, and its lane from there across the
   * field: its wash stretched along it and a little past both edges, so
   * its soft ends lie off the field, and its dashes, a run at a time, the
   * field's camera cutting off the wash's ends and the last run past the
   * far edge.
   */
  private drawWarning(
    i: number,
    heading: number,
    lit: ChevronLit,
    { field, metrics, zoom, palette }: Readonly<PaintContext>,
  ): void {
    const { x, y } = this.drawn;
    const alongX = Math.cos(heading);
    const alongY = Math.sin(heading);
    const length = laneLength(this.drawn, heading, field.torus);
    toCanvas(metrics, x, y, this.at);
    this.warnings[i]
      ?.setFrame(warningFrame(lit))
      .setPosition(this.at.x, this.at.y)
      .setRotation(heading)
      .setScale(zoom)
      .setVisible(true);
    const lane = this.lanes[i];
    if (lane) {
      toCanvas(
        metrics,
        x + (alongX * length) / 2,
        y + (alongY * length) / 2,
        this.at,
      );
      lane
        .setPosition(this.at.x, this.at.y)
        .setRotation(heading)
        .setScale(
          ((length + 2 * LANE.past) * metrics.unit) / lane.frame.width,
          (2 * LANE.half * metrics.unit) / lane.frame.height,
        )
        .setAlpha(laneWashAlpha(palette))
        .setVisible(true);
    }
    const runs = this.dashes[i] ?? [];
    for (let k = 0; k < runs.length; k++) {
      const from = LANE.dashesFrom + k * DASH_RUN;
      const middle = from + DASH_RUN / 2;
      toCanvas(metrics, x + alongX * middle, y + alongY * middle, this.at);
      runs[k]
        ?.setPosition(this.at.x, this.at.y)
        .setRotation(heading)
        .setScale(zoom)
        .setAlpha(LANE_DASH_ALPHA)
        .setVisible(from < length);
    }
  }

  /** Hides a record's comet. */
  private hideComet(i: number): void {
    this.comets[i]?.setVisible(false);
    this.edges[i]?.setVisible(false);
    this.tails[i]?.setVisible(false);
  }

  /** Hides a record's warning and its lane. */
  private hideWarning(i: number): void {
    this.warnings[i]?.setVisible(false);
    this.lanes[i]?.setVisible(false);
    for (const run of this.dashes[i] ?? []) run.setVisible(false);
  }
}
