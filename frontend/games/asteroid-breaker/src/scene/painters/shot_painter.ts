import type { GameObjects, Scene } from "phaser";
import { SHOT_FRAMES, SHOT_REACH } from "../../view/art/energy";
import type { FieldView } from "../../view/field/frame";
import { Copies } from "./copies";
import type { PaintContext, Painter } from "./painter";

/**
 * Draws the shots in flight: for each slot of the field's, its weapon's
 * shot along its travel, on both sides of an edge it reaches across. Its
 * halo is the halo painter's.
 */
export class ShotPainter implements Painter {
  /** Each shot slot's shot, made as a field of more slots starts. */
  private readonly shotsMade: Copies[] = [];

  constructor(
    private readonly scene: Scene,
    private readonly layer: GameObjects.Layer,
  ) {}

  /** Each shot slot's shot. */
  get shots(): readonly Copies[] {
    return this.shotsMade;
  }

  /**
   * Makes the images a new field's shot slots need, those it lacks, so none is
   * made in a frame of play.
   */
  start(field: FieldView): void {
    while (this.shotsMade.length < field.shots.slots.length) {
      this.shotsMade.push(new Copies(this.scene, this.layer, SHOT_FRAMES.gun));
    }
  }

  /**
   * Draws each shot in flight between its last place and its next, along its
   * travel, in its weapon's frame, and hides each slot that holds none.
   */
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
      copies.setFrame(SHOT_FRAMES[shot.weapon]);
      copies.setRotation(Math.atan2(shot.vy, shot.vx));
      copies.setScale(zoom);
      copies.showBetween(shot, alpha, SHOT_REACH[shot.weapon], metrics, torus);
    }
  }
}
