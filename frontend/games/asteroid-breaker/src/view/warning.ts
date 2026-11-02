import { clamp } from "@fz/core/math";
import type { Comet, Crossing } from "../rules/hazards";
import { STEP_MS, stepsIn } from "../rules/stepper";
import type { Moving, Torus } from "../rules/torus";
import { COMET_WARNING_MS } from "../rules/tuning";

/** How far inside the field's edge a comet's warning's middle lies, in field units, so all of its chevrons show. */
export const WARNING_INSET = 1.5;

/**
 * Writes where a comet's warning is drawn into a place and returns it: at
 * the edge the comet waits beyond, just inside it, level with the comet.
 */
export function warningAt(
  comet: Readonly<Crossing>,
  torus: Torus,
  into: Moving,
): Moving {
  into.x = clamp(comet.x, WARNING_INSET, torus.width - WARNING_INSET);
  into.y = clamp(comet.y, WARNING_INSET, torus.height - WARNING_INSET);
  return into;
}

/** Returns how long a comet has been warned of, in seconds, by the field's steps, so its warning pulses from its start. */
export function warnedFor(comet: Readonly<Comet>): number {
  return ((stepsIn(COMET_WARNING_MS) - comet.warnSteps) * STEP_MS) / 1000;
}
