import type { GameObjects, Scene } from "phaser";
import { MOST_CHARGE, RADIUS } from "../../rules/tuning";
import { FRAMES } from "../../view/art/frames";
import { type Place, toCanvas } from "../../view/field/field_metrics";
import { ATLAS } from "../atlas";
import { placeDot } from "./dots";
import type { PaintContext, Painter } from "./painter";

/** How far each pip of the meter lies from the waiting fuzzball's middle, in field units, as the art draws it: 20.5 of a cell of 40. */
const METER_REACH = 0.5125;

/**
 * Where each pip of the meter lies about the waiting fuzzball's middle, in
 * degrees from straight under it, toward the right, in the order they
 * light, as the art draws them.
 */
const METER_DEGREES = [-58, -29, 0, 29, 58] as const;

/** Each pip's place as shares of the meter's reach, across the canvas and down it. */
const PIPS = METER_DEGREES.map((degrees) => ({
  across: Math.sin((degrees * Math.PI) / 180),
  down: Math.cos((degrees * Math.PI) / 180),
}));

/**
 * Draws the charge's meter: five pips in an arc under the waiting
 * fuzzball, lit from the left as far as the charge, all of them for a hot
 * shot, whose charge is always full, and none while the fuzzball is in
 * the air.
 */
export class MeterPainter implements Painter {
  /** A pip for each notch of charge, made once, in the order they light. */
  readonly pips: readonly GameObjects.Image[];
  /** Where the waiting fuzzball's middle is, written each frame. */
  private readonly middle: Place = { x: 0, y: 0 };

  constructor(scene: Scene, layer: GameObjects.Layer) {
    this.pips = Array.from({ length: MOST_CHARGE }, () =>
      scene.add.image(0, 0, ATLAS, FRAMES.meterOff).setVisible(false),
    );
    layer.add([...this.pips]);
  }

  /** Draws the meter under the waiting fuzzball, or hides it while none waits. */
  draw({
    waitingX,
    boon,
    steer,
    metrics,
    baked,
  }: Readonly<PaintContext>): void {
    if (waitingX === null) {
      for (const pip of this.pips) pip.setVisible(false);
      return;
    }
    const lit = boon === "hot" ? MOST_CHARGE : steer.charge;
    const scale = metrics.unit / baked.unit;
    const reach = METER_REACH * metrics.unit;
    const { x, y } = toCanvas(metrics, waitingX, RADIUS, this.middle);
    let at = 0;
    for (const pip of this.pips) {
      const { across, down } = PIPS[at] ?? { across: 0, down: 1 };
      const frame = at < lit ? FRAMES.meterOn : FRAMES.meterOff;
      if (pip.frame.name !== frame) pip.setFrame(frame);
      placeDot(pip, x + across * reach, y + down * reach, scale).setVisible(
        true,
      );
      at++;
    }
  }
}
