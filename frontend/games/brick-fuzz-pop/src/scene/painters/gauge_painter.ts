import { ATLAS } from "@fz/brick-wall/scene/atlas";
import { placeDot } from "@fz/brick-wall/scene/painter";
import type { FieldMetrics } from "@fz/brick-wall/view/field_metrics";
import type { GameObjects, Scene } from "phaser";
import { MOST_CHARGE } from "../../rules/tuning";
import { FRAMES } from "../../view/art/frames";
import { createGaugePlace, gaugeOf } from "../../view/gauge/gauge";
import { itemAt } from "../../view/items";
import type { PaintContext, Painter } from "./painter";

/**
 * Draws the gauge over an aiming finger, where its hand may cover the
 * meter: the charge's five pips again, on a plate in an arc over the touch,
 * turned aside the least it must, lit from the left as far as the charge,
 * all of them for a hot shot, as the meter's are; shown only while the
 * steer says a finger aims and a fuzzball waits to be let fly, so it hides
 * as the shot flies.
 */
export class GaugePainter implements Painter {
  /** The plate the pips lie on, made once. */
  readonly plate: GameObjects.Image;
  /** A pip for each notch of charge, made once, in the order they light. */
  readonly pips: readonly GameObjects.Image[];
  /** Where the gauge lies over the touch, written each frame it is drawn, whose turn the next reads. */
  private readonly place = createGaugePlace();
  /** Whether the gauge shows, and the touch, the pips lit and the layout it was last drawn for, so a frame where none changed draws nothing. */
  private readonly drawn: {
    shown: boolean;
    touchX: number;
    touchY: number;
    lit: number;
    metrics: FieldMetrics | null;
  } = { shown: false, touchX: 0, touchY: 0, lit: 0, metrics: null };

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.plate = scene.add
      .image(0, 0, ATLAS, FRAMES.gaugePlate)
      .setVisible(false);
    this.pips = Array.from({ length: MOST_CHARGE }, () =>
      scene.add.image(0, 0, ATLAS, FRAMES.gaugeOff).setVisible(false),
    );
    layer.add([this.plate, ...this.pips]);
  }

  /**
   * Draws the gauge over the finger that aims while a fuzzball waits, or
   * hides it, as the touch, the charge or the layout changes.
   */
  draw({ steer, waitingX, boon, metrics }: Readonly<PaintContext>): void {
    const drawn = this.drawn;
    if (!steer.touch || waitingX === null) {
      if (!drawn.shown) return;
      drawn.shown = false;
      this.plate.setVisible(false);
      for (const pip of this.pips) pip.setVisible(false);
      return;
    }
    const lit = boon === "hot" ? MOST_CHARGE : steer.charge;
    const { touchX, touchY } = steer;
    if (
      drawn.shown &&
      touchX === drawn.touchX &&
      touchY === drawn.touchY &&
      lit === drawn.lit &&
      metrics === drawn.metrics
    ) {
      return;
    }
    // A gauge shown anew turns by where its finger is, not the way the
    // last one leaned near the field's middle.
    if (!drawn.shown) this.place.turn = 0;
    drawn.shown = true;
    drawn.touchX = touchX;
    drawn.touchY = touchY;
    drawn.lit = lit;
    drawn.metrics = metrics;
    const place = gaugeOf(metrics, touchX, touchY, this.place);
    // The plate is even in device pixels, so on a whole pixel it is sharp.
    this.plate
      .setPosition(Math.round(place.plate.x), Math.round(place.plate.y))
      .setAngle(place.turn)
      .setVisible(true);
    let at = 0;
    for (const pip of this.pips) {
      const frame = at < lit ? FRAMES.gaugeOn : FRAMES.gaugeOff;
      if (pip.frame.name !== frame) pip.setFrame(frame);
      const { x, y } = itemAt(place.pips, at);
      placeDot(pip, x, y, 1).setVisible(true);
      at++;
    }
  }
}
