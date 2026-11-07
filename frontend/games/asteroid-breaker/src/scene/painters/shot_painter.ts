import type { GameObjects, Scene } from "phaser";
import { FRAMES } from "../../view/art/art";
import { betweenOnAxis } from "../../view/field/frame";
import { Copies } from "./copies";
import type { PaintContext, Painter } from "./painter";

/** How far a shot's frame reaches from its middle, its capsule's half length and outline, in field units. */
const SHOT_REACH = 0.5;

/** Draws the shots in flight: for each slot of the field's, a capsule along its travel, on both sides of an edge it reaches across. */
export class ShotPainter implements Painter {
  readonly shots: Copies[] = [];

  constructor(
    private readonly scene: Scene,
    private readonly layer: GameObjects.Layer,
  ) {}

  /** Makes the images a field of so many shot slots needs, those it lacks, as a new field is shown. */
  fit(slots: number): void {
    while (this.shots.length < slots) {
      this.shots.push(new Copies(this.scene, this.layer, FRAMES.shot));
    }
  }

  /** Takes up each image's frame again, once the atlas has been baked again. */
  refresh(): void {
    for (const shot of this.shots) shot.refresh();
  }

  /** Draws each shot in flight between its last place and its next, along its travel, and hides each slot that holds none. */
  draw({ field, alpha, metrics, zoom }: Readonly<PaintContext>): void {
    const { torus } = field;
    const { slots } = field.shots;
    for (let i = 0; i < this.shots.length; i++) {
      const copies = this.shots[i];
      const shot = slots[i];
      if (!copies) continue;
      if (!shot || shot.lifeSteps === 0) {
        copies.hide();
        continue;
      }
      copies.setRotation(Math.atan2(shot.vy, shot.vx));
      copies.setScale(zoom);
      copies.show(
        betweenOnAxis(shot.lastX, shot.x, alpha, torus.width),
        betweenOnAxis(shot.lastY, shot.y, alpha, torus.height),
        SHOT_REACH,
        metrics,
        torus,
      );
    }
  }
}
