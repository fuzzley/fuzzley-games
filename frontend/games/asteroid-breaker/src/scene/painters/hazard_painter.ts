import { lerp } from "@fz/core/math";
import type { GameObjects, Scene } from "phaser";
import type { Burr } from "../../rules/hazards/burrs";
import { COMET_RECORDS } from "../../rules/hazards/comets";
import { type Moving, type Torus, wrap } from "../../rules/torus";
import { FIELD_LONGEST_SIDE, FIELD_SHORT_SIDE } from "../../rules/tuning";
import {
  BURR_FRAMES,
  BURR_HOLDS,
  BURR_REACH,
  CLINGING_SHARE,
  COMET_FRAMES,
  DASH_RUN,
  LANE,
  LANE_DASH_ALPHA,
  TAIL_BEHIND,
  burrGlintAt,
  isBarbed,
  isGlinted,
  laneWashAlpha,
  warningFrame,
} from "../../view/art/things";
import { toCanvas } from "../../view/field/field_metrics";
import { type FieldView, wrappedBetween } from "../../view/field/frame";
import {
  type ChevronLit,
  chevronLit,
  laneLength,
  tailShare,
  warningAt,
} from "../../view/field/warning";
import { ATLAS, ROCK_ATLAS } from "../atlas";
import { Copies } from "./copies";
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
 * field. Their halos are the halo painter's. Draws the burrs too: each
 * adrift, under the comets, turned the way it flies, and each clinging to
 * the pod at its hold, turning with it, each with its glint toward the
 * light; their barbs and glints only where the field is large enough for
 * them, by its own scale, not the atlas's.
 *
 * A comet crosses rather than wraps, so it is drawn once, and the field's
 * camera cuts it off as it comes in and leaves; so is a burr coming in,
 * which is drawn past each edge it reaches across once it wraps.
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
  /** Each hold's burr clinging. */
  readonly clinging: readonly Copies[];
  /** The glint on each hold's burr clinging. */
  readonly clingingGlints: readonly Copies[];

  /** Each burr slot's burr adrift, made as a field of more slots starts. */
  private readonly burrsMade: Copies[] = [];
  /** The glint on each burr slot's burr adrift, made with it. */
  private readonly burrGlintsMade: Copies[] = [];

  /** Where a comet or a burr adrift is drawn on the field, or where a warning stands, written each frame. */
  private readonly drawn: Moving = { x: 0, y: 0 };
  /** Where a comet or a part of it is on the canvas, written each frame. */
  private readonly at: Moving = { x: 0, y: 0 };
  /** Where a burr's glint lies from its middle, written each frame. */
  private readonly glintAt: Moving = { x: 0, y: 0 };

  /**
   * Makes each record's images: its comet's and its warning's in a layer,
   * and its lane's in one under all that lies on the field; and each hold's
   * burr clinging, in one over the ship.
   */
  constructor(
    private readonly scene: Scene,
    private readonly layer: GameObjects.Layer,
    lanesLayer: GameObjects.Layer,
    burrsLayer: GameObjects.Layer,
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
    this.clinging = BURR_HOLDS.map(
      (hold) => new Copies(scene, burrsLayer, hold.frame),
    );
    this.clingingGlints = BURR_HOLDS.map(
      () => new Copies(scene, burrsLayer, BURR_FRAMES.clingingGlint),
    );
  }

  /** Each burr slot's burr adrift. */
  get burrs(): readonly Copies[] {
    return this.burrsMade;
  }

  /** The glint on each burr slot's burr adrift. */
  get burrGlints(): readonly Copies[] {
    return this.burrGlintsMade;
  }

  /**
   * Makes the images for each burr a new field may have adrift at once that
   * the last didn't, under the comets: each glint under all else in the
   * layer, then each burr under its glint.
   */
  start(field: FieldView): void {
    while (this.burrsMade.length < field.burrs.slots.length) {
      const glint = new Copies(this.scene, this.layer, BURR_FRAMES.glint);
      const burr = new Copies(this.scene, this.layer, BURR_FRAMES.adrift);
      glint.sendToBack();
      burr.sendToBack();
      this.burrGlintsMade.push(glint);
      this.burrsMade.push(burr);
    }
  }

  /**
   * Draws each comet crossing between its last place and its next, and each
   * warned of at its edge, with its lane; and each burr adrift between its
   * last place and its next, and those clinging to the pod.
   */
  draw(context: Readonly<PaintContext>): void {
    this.drawComets(context);
    this.drawBurrs(context);
    this.drawClinging(context);
  }

  /** Draws each comet and each warning, with its lane, or hides it. */
  private drawComets(context: Readonly<PaintContext>): void {
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

  /**
   * Draws each burr adrift between its last place and its next, turned the
   * way it flies, barbed where the field is large enough, its glint toward
   * the light where it shows: once while it comes in, and past each edge
   * it reaches across once it wraps; and hides each slot that holds none.
   */
  private drawBurrs(context: Readonly<PaintContext>): void {
    const { field, alpha, metrics, zoom, palette } = context;
    const frame = isBarbed(metrics, 1) ? BURR_FRAMES.adrift : BURR_FRAMES.bare;
    const glinted = isGlinted(metrics, 1);
    burrGlintAt(palette, 1, this.glintAt);
    for (let i = 0; i < this.burrsMade.length; i++) {
      const images = this.burrsMade[i];
      const glint = this.burrGlintsMade[i];
      const burr = field.burrs.slots[i];
      if (!images || !glint) continue;
      if (burr?.live !== true) {
        images.hide();
        glint.hide();
        continue;
      }
      this.drawnBurr(burr, alpha, field.torus);
      const { x, y } = this.drawn;
      images.setFrame(frame);
      images.setRotation(burr.heading);
      images.setScale(zoom);
      glint.setScale(zoom);
      if (burr.wraps) {
        images.show(x, y, BURR_REACH, metrics, field.torus);
      } else {
        images.showOnce(x, y, metrics);
      }
      if (!glinted) {
        glint.hide();
      } else if (burr.wraps) {
        glint.show(
          x + this.glintAt.x,
          y + this.glintAt.y,
          BURR_REACH,
          metrics,
          field.torus,
        );
      } else {
        glint.showOnce(x + this.glintAt.x, y + this.glintAt.y, metrics);
      }
    }
  }

  /** Writes where a burr adrift is drawn between its last place and its next: straight on while it comes in, the shortest way across the wrap once it wraps. */
  private drawnBurr(burr: Readonly<Burr>, alpha: number, torus: Torus): void {
    if (burr.wraps) {
      wrappedBetween(burr, alpha, torus, this.drawn);
      return;
    }
    this.drawn.x = lerp(burr.lastX, burr.x, alpha);
    this.drawn.y = lerp(burr.lastY, burr.y, alpha);
  }

  /**
   * Draws a burr at each hold of the pod for each clinging to it, the first
   * to cling at the first, turning with the pod, each a little smaller than
   * one adrift, barbed where the field is large enough, its glint toward
   * the light where it shows, past each edge it reaches across; and hides
   * the rest, and every one between one pod and the next.
   */
  private drawClinging(context: Readonly<PaintContext>): void {
    const { field, shipDrawn, metrics, zoom, palette } = context;
    const { ship, torus } = field;
    if (!ship || !shipDrawn) {
      for (const images of this.clinging) images.hide();
      for (const glint of this.clingingGlints) glint.hide();
      return;
    }
    const { angle } = shipDrawn;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const barbed = isBarbed(metrics, CLINGING_SHARE);
    const glinted = isGlinted(metrics, CLINGING_SHARE);
    burrGlintAt(palette, CLINGING_SHARE, this.glintAt);
    for (let i = 0; i < BURR_HOLDS.length; i++) {
      const hold = BURR_HOLDS[i];
      const images = this.clinging[i];
      const glint = this.clingingGlints[i];
      if (!hold || !images || !glint) continue;
      if (i >= ship.burrs) {
        images.hide();
        glint.hide();
        continue;
      }
      const x = wrap(
        shipDrawn.x + hold.at.x * cos - hold.at.y * sin,
        torus.width,
      );
      const y = wrap(
        shipDrawn.y + hold.at.x * sin + hold.at.y * cos,
        torus.height,
      );
      images.setFrame(barbed ? hold.frame : hold.bareFrame);
      images.setRotation(hold.turn + angle);
      images.setScale(zoom);
      glint.setScale(zoom);
      images.show(x, y, BURR_REACH, metrics, torus);
      if (glinted) {
        glint.show(
          x + this.glintAt.x,
          y + this.glintAt.y,
          BURR_REACH,
          metrics,
          torus,
        );
      } else {
        glint.hide();
      }
    }
  }

  /** Hides a record's warning and its lane. */
  private hideWarning(i: number): void {
    this.warnings[i]?.setVisible(false);
    this.lanes[i]?.setVisible(false);
    for (const run of this.dashes[i] ?? []) run.setVisible(false);
  }
}
