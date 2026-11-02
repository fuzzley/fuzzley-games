import type { GameObjects, Scene } from "phaser";
import type { Moving } from "../rules/torus";
import { STRAY_RADIUS } from "../rules/tuning";
import { FRAMES, STRAY_DROP } from "../view/art";
import { type FieldMetrics, toCanvas } from "../view/field_metrics";
import { bobShare } from "../view/flourish";
import { between, betweenOnAxis } from "../view/frame";
import {
  LOOK,
  PILOT_SIZES,
  eyesFrame,
  lookingFrom,
  pilotFrame,
} from "../view/pilot_art";
import { ATLAS } from "./atlas";
import type { PaintContext, Painter } from "./painter";

/**
 * Draws the stray adrift: its pilot in its ink in a bubble, bobbing in it
 * where motion is welcome, its eyes on the ship.
 *
 * A stray crosses rather than wraps, so it is drawn once, and the field's
 * camera cuts it off as it comes in and leaves.
 */
export class StrayPainter implements Painter {
  readonly bubble: GameObjects.Image;
  readonly pilot: GameObjects.Image;
  readonly eyes: GameObjects.Image;

  /** Its parts, back to front. */
  private readonly parts: readonly GameObjects.Image[];
  /** Where a part is on the field, written each frame. */
  private readonly place: Moving = { x: 0, y: 0 };
  /** Where it is on the canvas, written each frame. */
  private readonly at: Moving = { x: 0, y: 0 };
  /** Where the ship the stray watches is, written each frame. */
  private readonly watched: Moving = { x: 0, y: 0 };
  /** The way the stray looks, written each frame. */
  private readonly look: Moving = { x: 0, y: 0 };

  constructor(scene: Scene, layer: GameObjects.Layer) {
    const image = (frame: string): GameObjects.Image =>
      scene.add.image(0, 0, ATLAS, frame).setVisible(false);
    this.bubble = image(FRAMES.bubble);
    this.pilot = image(pilotFrame(0, "adrift"));
    this.eyes = image(eyesFrame("adrift"));
    this.parts = [this.bubble, this.pilot, this.eyes];
    layer.add([...this.parts]);
  }

  /** Takes up each image's frame again, once the atlas has been baked again. */
  refresh(): void {
    for (const part of this.parts) part.setFrame(part.frame.name);
  }

  /** Draws the stray adrift between its last place and its next, or nothing while none is. */
  draw({
    field,
    alpha,
    metrics,
    zoom,
    now,
    motion,
  }: Readonly<PaintContext>): void {
    const stray = field.strays.adrift;
    for (const part of this.parts) part.setVisible(stray.live);
    if (!stray.live) return;
    const x = between(stray.lastX, stray.x, alpha);
    const y = between(stray.lastY, stray.y, alpha);
    const { ship, torus } = field;
    if (ship) {
      this.watched.x = betweenOnAxis(ship.lastX, ship.x, alpha, torus.width);
      this.watched.y = betweenOnAxis(ship.lastY, ship.y, alpha, torus.height);
    }
    lookingFrom(x, y, ship ? this.watched : null, stray.heading, this.look);
    // The pilot sits a little low in its bubble, and bobs about there.
    const sits =
      y + (STRAY_DROP + bobShare(now / 1000, 0, motion)) * STRAY_RADIUS;
    const size = PILOT_SIZES.adrift;
    const pilot = pilotFrame(stray.pilot, "adrift");
    if (this.pilot.frame.name !== pilot) this.pilot.setFrame(pilot);
    this.put(this.bubble, x, y, zoom, metrics);
    this.put(this.pilot, x, sits, zoom, metrics);
    this.put(
      this.eyes,
      x + this.look.x * LOOK.across * size,
      sits + this.look.y * LOOK.down * size,
      zoom,
      metrics,
    );
  }

  /** Puts a part at a place on the field, at the field's zoom. */
  private put(
    part: GameObjects.Image,
    x: number,
    y: number,
    zoom: number,
    metrics: FieldMetrics,
  ): void {
    this.place.x = x;
    this.place.y = y;
    toCanvas(metrics, this.place, this.at);
    part.setPosition(this.at.x, this.at.y).setScale(zoom);
  }
}
