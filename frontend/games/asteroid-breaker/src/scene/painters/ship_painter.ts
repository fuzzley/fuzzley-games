import type { GameObjects, Scene } from "phaser";
import { isGuarded, thrustOf } from "../../rules/ship/ship";
import type { Torus } from "../../rules/torus";
import {
  LOOK,
  PILOT_SIZES,
  eyesFrame,
  pilotFrame,
} from "../../view/art/pilot_art";
import {
  FLAME_BEHIND,
  SHIP_FRAMES,
  SHIP_REACH,
  WINDOW,
  flameShare,
} from "../../view/art/ship_art";
import {
  blinkShown,
  eyesOpen,
  flickerShare,
} from "../../view/effects/flourish";
import type { FieldMetrics } from "../../view/field/field_metrics";
import { Copies } from "./copies";
import type { PaintContext, Painter } from "./painter";

/** How opaque the ring round a guarded ship is: faint, as the ship blinks within it. */
export const GUARD_ALPHA = 0.5;

/**
 * Draws the ship in play: its hull turned as it heads, its flame as long as
 * the thrust that pushes it, its pilot upright in its window looking the
 * way it heads and blinking where motion is welcome, and the ring of its
 * guard or of the Shield, each on both sides of an edge it reaches across.
 * A ship nothing can touch, waiting or guarded, blinks within its ring.
 */
export class ShipPainter implements Painter {
  readonly guard: Copies;
  readonly shield: Copies;
  readonly flame: Copies;
  readonly hull: Copies;
  readonly pilot: Copies;
  readonly eyes: Copies;

  /** The ship itself, which blinks while it is guarded: its flame, hull, pilot and eyes. */
  private readonly body: readonly Copies[];
  /** Every part, back to front. */
  private readonly parts: readonly Copies[];

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.guard = new Copies(scene, layer, SHIP_FRAMES.guard);
    this.guard.setAlpha(GUARD_ALPHA);
    this.shield = new Copies(scene, layer, SHIP_FRAMES.shield);
    this.flame = new Copies(scene, layer, SHIP_FRAMES.flame);
    this.hull = new Copies(scene, layer, SHIP_FRAMES.ship);
    this.pilot = new Copies(scene, layer, pilotFrame(0, "seated"));
    this.eyes = new Copies(scene, layer, eyesFrame("seated"));
    this.body = [this.flame, this.hull, this.pilot, this.eyes];
    this.parts = [this.guard, this.shield, ...this.body];
  }

  /**
   * Draws the ship between its last place and turn and its next, or nothing
   * between one ship and the next.
   */
  draw({
    field,
    shipDrawn,
    metrics,
    zoom,
    now,
    motion,
  }: Readonly<PaintContext>): void {
    const { ship, torus } = field;
    const pilot = field.crew.flying[0];
    if (!ship || !shipDrawn || pilot === undefined) {
      for (const part of this.parts) part.hide();
      return;
    }
    const { x, y, angle } = shipDrawn;
    const guarded = isGuarded(ship);
    showRing(this.guard, guarded, x, y, zoom, metrics, torus);
    showRing(this.shield, field.shielded, x, y, zoom, metrics, torus);
    const seconds = now / 1000;
    if (guarded && !blinkShown(seconds)) {
      for (const part of this.body) part.hide();
      return;
    }
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const thrust = thrustOf(ship);
    if (thrust > 0) {
      this.flame.setRotation(angle);
      this.flame.setScale(
        zoom * flameShare(thrust) * flickerShare(seconds, motion),
        zoom,
      );
      this.flame.show(
        x - cos * FLAME_BEHIND,
        y - sin * FLAME_BEHIND,
        SHIP_REACH,
        metrics,
        torus,
      );
    } else {
      this.flame.hide();
    }
    this.hull.setRotation(angle);
    this.hull.setScale(zoom);
    this.hull.show(x, y, SHIP_REACH, metrics, torus);
    const windowX = x + cos * WINDOW.x;
    const windowY = y + sin * WINDOW.x;
    this.pilot.setFrame(pilotFrame(pilot, "seated"));
    this.pilot.setScale(zoom);
    this.pilot.show(windowX, windowY, SHIP_REACH, metrics, torus);
    this.eyes.setScale(zoom, zoom * eyesOpen(seconds, pilot, motion));
    this.eyes.show(
      windowX + cos * LOOK.across * PILOT_SIZES.seated,
      windowY + sin * LOOK.down * PILOT_SIZES.seated,
      SHIP_REACH,
      metrics,
      torus,
    );
  }
}

/** Shows a ring about the ship's middle while it guards the ship, or hides it. */
function showRing(
  ring: Copies,
  shown: boolean,
  x: number,
  y: number,
  zoom: number,
  metrics: FieldMetrics,
  torus: Torus,
): void {
  if (!shown) {
    ring.hide();
    return;
  }
  ring.setScale(zoom);
  ring.show(x, y, SHIP_REACH, metrics, torus);
}
