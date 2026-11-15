import type { GameObjects, Scene } from "phaser";
import {
  MUZZLE_BEATS,
  MUZZLE_FRAME,
  MUZZLE_REACH,
  muzzleHalo,
} from "../../view/art/energy";
import { muzzleAt, muzzleBeatOf } from "../../view/effects/flourish";
import type { Drawn } from "../../view/field/frame";
import { Copies } from "./copies";
import type { HaloPainter } from "./halo_painter";
import type { PaintContext, Painter } from "./painter";

/** The halo of each beat of the muzzle's flash, made once. */
const MUZZLE_HALOS = [
  muzzleHalo(MUZZLE_BEATS[0]),
  muzzleHalo(MUZZLE_BEATS[1]),
] as const;

/**
 * Draws the muzzle's flash as a shot leaves: its star at the pod's nose,
 * turned as the pod points, on both sides of an edge it reaches across, in
 * two beats, whole, then smaller and fainter, with its halo in the accent
 * through the halo painter, which draws before it each frame.
 */
export class MuzzlePainter implements Painter {
  /** The muzzle's flash's star. */
  readonly star: Copies;

  /** When the last shot left, in the scene's time, or −Infinity before the first. */
  private firedAt = -Infinity;
  /** Where the flash shows on the field, and how far it is turned, written each frame it shows. */
  private readonly at: Drawn = { x: 0, y: 0, angle: 0 };

  /** Makes the flash's images in a layer, and reserves the halo painter's images for its halo. */
  constructor(
    scene: Scene,
    layer: GameObjects.Layer,
    private readonly halos: HaloPainter,
  ) {
    this.star = new Copies(scene, layer, MUZZLE_FRAME);
    halos.reserve(1);
  }

  /** Flashes the muzzle, as a shot leaves. */
  fire(now: number): void {
    this.firedAt = now;
  }

  /** Puts the flash out, as a new field starts. */
  start(): void {
    this.firedAt = -Infinity;
    this.star.hide();
  }

  /**
   * Draws the flash's beat at the scene's time at the nose of the pod as it
   * is drawn, and its halo, or hides it once both beats are over or with
   * no pod.
   */
  draw(context: Readonly<PaintContext>): void {
    const { shipDrawn, field, metrics, palette, zoom, now } = context;
    const beat = muzzleBeatOf(now - this.firedAt);
    if (beat === null || shipDrawn === null) {
      this.star.hide();
      return;
    }
    const { size, alpha } = MUZZLE_BEATS[beat];
    const at = muzzleAt(shipDrawn, field.torus, this.at);
    this.star.setRotation(at.angle);
    this.star.setScale(zoom * size);
    this.star.setAlpha(alpha);
    this.star.show(at.x, at.y, MUZZLE_REACH * size, metrics, field.torus);
    this.halos.glow(MUZZLE_HALOS[beat], palette.accent, at, context);
  }
}
