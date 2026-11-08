import { fadeAlpha, shareDone } from "@fz/core/math";
import type { GameObjects, Scene } from "phaser";
import { wrap } from "../../rules/torus";
import { SHIP_FRAMES, SHIP_REACH } from "../../view/art/ship_art";
import {
  trailAlpha,
  trailOutlinesLaid,
  trailReach,
} from "../../view/effects/flourish";
import { DASH_TRAIL, TRAIL_MS } from "../../view/effects/timing";
import { Copies } from "./copies";
import type { PaintContext, Painter } from "./painter";

/**
 * Describes a dash's trail, laid from where it started the way it went, a
 * share along each axis.
 */
interface Trail {
  x: number;
  y: number;
  wayX: number;
  wayY: number;
  /**
   * The field's step as the dash started, which its outlines are laid on
   * from, or Infinity for none.
   */
  fromStep: number;
  /**
   * When each of its outlines was laid, in the scene's time, or −Infinity
   * for one not yet laid.
   */
  readonly laidAt: number[];
}

/**
 * Draws a dash's trail: fading outlines of the ship along its path, each
 * laid as the field steps the ship past where it lies, so a field that
 * stops lays none ahead of its ship. Each is made once, and the scene lays
 * them only where motion is welcome.
 */
export class TrailPainter implements Painter {
  /** A dash's outlines, counting from where it started. */
  readonly outlines: readonly Copies[];

  private readonly dash: Trail = {
    x: 0,
    y: 0,
    wayX: 0,
    wayY: 0,
    fromStep: Infinity,
    laidAt: Array.from({ length: DASH_TRAIL }, () => -Infinity),
  };

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.outlines = Array.from(
      { length: DASH_TRAIL },
      () => new Copies(scene, layer, SHIP_FRAMES.ship),
    );
  }

  /**
   * Lays a dash's trail from where it started, the way it went, a share
   * along each axis, its outlines laid as the field steps on from the step
   * given.
   */
  lay(
    x: number,
    y: number,
    wayX: number,
    wayY: number,
    fromStep: number,
  ): void {
    const { dash } = this;
    dash.x = x;
    dash.y = y;
    dash.wayX = wayX;
    dash.wayY = wayY;
    dash.fromStep = fromStep;
    dash.laidAt.fill(-Infinity);
  }

  /** Lays each outline the field has stepped the ship past, and fades it from then, or hides it. */
  draw({ field, metrics, zoom, now }: Readonly<PaintContext>): void {
    const { dash } = this;
    const { torus } = field;
    const laid = trailOutlinesLaid(field.steps - dash.fromStep);
    const heading = Math.atan2(dash.wayY, dash.wayX);
    for (let i = 0; i < this.outlines.length; i++) {
      const outline = this.outlines[i];
      if (!outline) continue;
      if (i < laid && dash.laidAt[i] === -Infinity) dash.laidAt[i] = now;
      const done = shareDone(dash.laidAt[i] ?? -Infinity, now, TRAIL_MS);
      if (done === 1) {
        outline.hide();
        continue;
      }
      const reach = trailReach(i);
      outline.setRotation(heading);
      outline.setScale(zoom);
      outline.setAlpha(trailAlpha(i) * fadeAlpha(done));
      outline.show(
        wrap(dash.x + dash.wayX * reach, torus.width),
        wrap(dash.y + dash.wayY * reach, torus.height),
        SHIP_REACH,
        metrics,
        torus,
      );
    }
  }

  /** Puts the trail away, as a new field starts. */
  start(): void {
    this.dash.fromStep = Infinity;
    this.dash.laidAt.fill(-Infinity);
  }
}
