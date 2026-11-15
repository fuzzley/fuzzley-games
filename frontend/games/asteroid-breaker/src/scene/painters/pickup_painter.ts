import type { GameObjects, Scene } from "phaser";
import { PICKUP_RECORDS } from "../../rules/rocks/drops";
import {
  PICKUP_REACH,
  pickupFrame,
  pickupLook,
  restingLook,
} from "../../view/art/things";
import { Copies } from "./copies";
import type { PaintContext, Painter } from "./painter";

/**
 * Draws the pickups floating on the field: each as its orb, breathing where
 * motion is welcome, each slot a phase apart, and blinking dim through its
 * last seconds, on both sides of an edge it reaches across. Its halo is the
 * halo painter's.
 */
export class PickupPainter implements Painter {
  /** Each record's pickup. */
  readonly pickups: readonly Copies[];
  /** How the pickup being drawn shows, written for each. */
  private readonly look = restingLook();

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.pickups = Array.from(
      { length: PICKUP_RECORDS },
      () => new Copies(scene, layer, pickupFrame("spread")),
    );
  }

  /**
   * Draws each pickup floating between its last place and its next, and hides
   * each record out of play.
   */
  draw({
    field,
    alpha,
    metrics,
    zoom,
    now,
    motion,
  }: Readonly<PaintContext>): void {
    const { torus } = field;
    const seconds = now / 1000;
    for (let i = 0; i < this.pickups.length; i++) {
      const copies = this.pickups[i];
      const floating = field.pickups[i];
      if (!copies) continue;
      if (!floating?.live) {
        copies.hide();
        continue;
      }
      const look = pickupLook(floating, i, seconds, motion, this.look);
      copies.setFrame(pickupFrame(floating.id));
      copies.setScale(zoom * look.scale);
      copies.setAlpha(look.alpha);
      copies.showBetween(
        floating,
        alpha,
        PICKUP_REACH * look.scale,
        metrics,
        torus,
      );
    }
  }
}
