import type { GameObjects, Scene } from "phaser";
import { COMET_RECORDS } from "../../rules/hazards/comets";
import type { Moving } from "../../rules/torus";
import { FRAMES } from "../../view/art/art";
import { pulseAlpha } from "../../view/effects/flourish";
import { toCanvas } from "../../view/field/field_metrics";
import { between } from "../../view/field/frame";
import { warnedFor, warningAt } from "../../view/field/warning";
import { ATLAS } from "../atlas";
import type { PaintContext, Painter } from "./painter";

/**
 * Draws the comets: each crossing the field, turned the way it flies, and
 * each warned of, as a chevron pulsing at the edge it will come in by.
 *
 * A comet crosses rather than wraps, so it is drawn once, and the field's
 * camera cuts it off as it comes in and leaves.
 */
export class HazardPainter implements Painter {
  /** Each record's comet. */
  readonly comets: readonly GameObjects.Image[];
  /** Each record's warning. */
  readonly warnings: readonly GameObjects.Image[];

  /** Where a comet or its warning is on the field, written each frame. */
  private readonly place: Moving = { x: 0, y: 0 };
  /** Where it is on the canvas, written each frame. */
  private readonly at: Moving = { x: 0, y: 0 };

  constructor(scene: Scene, layer: GameObjects.Layer) {
    const images = (frame: string): GameObjects.Image[] =>
      Array.from({ length: COMET_RECORDS }, () =>
        scene.add.image(0, 0, ATLAS, frame).setVisible(false),
      );
    this.comets = images(FRAMES.comet);
    this.warnings = images(FRAMES.warning);
    layer.add([...this.comets, ...this.warnings]);
  }

  /** Takes up each image's frame again, once the atlas has been baked again. */
  refresh(): void {
    for (const comet of this.comets) comet.setFrame(FRAMES.comet);
    for (const warning of this.warnings) warning.setFrame(FRAMES.warning);
  }

  /** Draws each comet crossing between its last place and its next, and each warned of at its edge. */
  draw({ field, alpha, metrics, zoom, motion }: Readonly<PaintContext>): void {
    for (let i = 0; i < this.comets.length; i++) {
      const image = this.comets[i];
      const warning = this.warnings[i];
      const comet = field.comets.slots[i];
      if (!image || !warning) continue;
      const live = comet?.live === true;
      const warned = live && comet.warnSteps > 0;
      image.setVisible(live && !warned);
      warning.setVisible(warned);
      if (!live) continue;
      if (warned) {
        warningAt(comet, field.torus, this.place);
      } else {
        this.place.x = between(comet.lastX, comet.x, alpha);
        this.place.y = between(comet.lastY, comet.y, alpha);
      }
      toCanvas(metrics, this.place, this.at);
      (warned ? warning : image)
        .setPosition(this.at.x, this.at.y)
        .setRotation(comet.heading)
        .setScale(zoom)
        .setAlpha(warned ? pulseAlpha(warnedFor(comet), motion) : 1);
    }
  }
}
