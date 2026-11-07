import type { GameObjects, Scene } from "phaser";
import { PICKUP_RECORDS, blinks } from "../../rules/rocks/drops";
import { pickupFrame } from "../../view/art/art";
import {
  GOLDEN_ANGLE,
  blinkShown,
  breathScale,
} from "../../view/effects/flourish";
import { betweenOnAxis } from "../../view/field/frame";
import { Copies } from "./copies";
import type { PaintContext, Painter } from "./painter";

/** How far a pickup's frame reaches from its middle, its outline and its breath included, in field units. */
const PICKUP_REACH = 1.1;

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

  /** Takes up each image's frame again, once the atlas has been baked again. */
  refresh(): void {
    for (const pickup of this.pickups) pickup.refresh();
  }

  /** Draws each pickup floating between its last place and its next, and hides each record out of play. */
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
      copies.setFrame(pickupFrame(floating.id));
      copies.setScale(zoom * breathScale(seconds, i * GOLDEN_ANGLE, motion));
      copies.show(
        betweenOnAxis(floating.lastX, floating.x, alpha, torus.width),
        betweenOnAxis(floating.lastY, floating.y, alpha, torus.height),
        PICKUP_REACH,
        metrics,
        torus,
      );
    }
  }
}
