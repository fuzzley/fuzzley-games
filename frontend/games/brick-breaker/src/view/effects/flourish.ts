import { easeOutCubic } from "@fz/core/math";
import { STEP_MS, stepsIn } from "../../rules/stepper";
import type { FieldView } from "../field/frame";
import { GLOW_AFTER_MS, GLOW_BRICKS, GLOW_PULSE_MS } from "./timing";

/** How far a brick that holds a hit swells at its widest, as a share of its size. */
export const POP_SWELL = 0.12;

/** How wide a blast's ring starts, as a share of its widest. */
export const RING_FROM = 0.25;

/** How faint the last bricks' glow gets between pulses. */
export const GLOW_LEAST = 0.35;

/** Returns the scale of a brick that holds a hit, a share through its pop: swelling, then settling back. */
export function popScale(done: number): number {
  return 1 + POP_SWELL * Math.sin(Math.PI * done);
}

/** Returns the scale of a blast's ring, spreading fast, then slowing. */
export function ringScale(done: number): number {
  return RING_FROM + (1 - RING_FROM) * easeOutCubic(done);
}

/**
 * Returns how bright the last bricks a level needs glow: 0 until few enough
 * are left and none has broken for a while, then pulsing from full where
 * motion is welcome, else full.
 */
export function glowAlpha(
  field: Pick<FieldView, "needed" | "steps">,
  brokeAt: number,
  motion: boolean,
): number {
  if (field.needed === 0 || field.needed > GLOW_BRICKS) return 0;
  const glowing = field.steps - brokeAt - stepsIn(GLOW_AFTER_MS);
  if (glowing < 0) return 0;
  if (!motion) return 1;
  const turn = (glowing * STEP_MS) / GLOW_PULSE_MS;
  return (
    GLOW_LEAST + ((1 - GLOW_LEAST) * (1 + Math.cos(2 * Math.PI * turn))) / 2
  );
}
