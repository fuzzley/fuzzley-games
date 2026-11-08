import type { GameObjects, Scene } from "phaser";
import { PICKUP_RECORDS, blinks } from "../../rules/rocks/drops";
import { PICKUP_REACH, pickupFrame } from "../../view/art/art";
import {
  GOLDEN_ANGLE,
  blinkShown,
  breathScale,
} from "../../view/effects/flourish";
import { Copies } from "./copies";
import type { PaintContext, Painter } from "./painter";

/**
 * Draws the pickups floating on the field: each in its frame, breathing
 * where motion is welcome, each slot a phase apart, and blinking through
 * its last seconds, on both sides of an edge it reaches across.
 */
export class PickupPainter implements Painter {
  /** Each record's pickup. */
  readonly pickups: readonly Copies[];

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
      if (!floating?.live || (blinks(floating) && !blinkShown(seconds))) {
        copies.hide();
        continue;
      }
      const breath = breathScale(seconds, i * GOLDEN_ANGLE, motion);
      copies.setFrame(pickupFrame(floating.id));
      copies.setScale(zoom * breath);
      copies.showBetween(
        floating,
        alpha,
        PICKUP_REACH * breath,
        metrics,
        torus,
      );
    }
  }
}
