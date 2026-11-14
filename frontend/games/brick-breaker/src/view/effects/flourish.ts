import { easeOutCubic, fadeAlpha } from "@fz/core/math";
import { mixColors } from "@fz/phaser/color";
import { STEP_MS, stepsIn } from "../../rules/stepper";
import type { FieldView } from "../field/frame";
import { GLOW_AFTER_MS, GLOW_BRICKS, GLOW_PULSE_MS } from "./timing";

/** How far a brick that holds a hit swells at its widest, as a share of its size. */
export const POP_SWELL = 0.12;

/** How wide a blast's ring starts, as a share of its widest. */
export const RING_FROM = 0.25;

/** How faint the last bricks' glow gets between pulses. */
export const GLOW_LEAST = 0.35;

/**
 * How much of its brick's color a shard keeps once it has dimmed, the rest
 * the field's.
 */
export const SHARD_DIMMED = 0.3;

/** Returns the scale of a brick that holds a hit, a share through its pop: swelling, then settling back. */
export function popScale(done: number): number {
  return 1 + POP_SWELL * Math.sin(Math.PI * done);
}

/** Returns the scale of a blast's ring, spreading fast, then slowing. */
export function ringScale(done: number): number {
  return RING_FROM + (1 - RING_FROM) * easeOutCubic(done);
}

/**
 * Returns the color a broken brick's shard takes, a share through its
 * flight: its brick's as it is thrown, dimming toward the field's as it
 * falls, so a shard loses the contrast a ball keeps and never looks like
 * one.
 */
export function shardTint(color: number, field: number, done: number): number {
  return mixColors(color, field, 1 - (1 - SHARD_DIMMED) * done);
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

/** How wide the ring about a ball starts as its streak steps, as a share of its widest. */
export const STREAK_RING_FROM = 0.4;

/** How far through a streak's step its count shows whole, before it fades. */
export const COUNT_WHOLE = 0.5;

/** Returns the scale of the ring about a ball as its streak steps, a share through it: spreading from about the ball, fast, then slowing. */
export function streakRingScale(done: number): number {
  return STREAK_RING_FROM + (1 - STREAK_RING_FROM) * easeOutCubic(done);
}

/** Returns how opaque a streak's count is, a share through its step: whole for the first part, then fading. */
export function countAlpha(done: number): number {
  if (done <= COUNT_WHOLE) return 1;
  return fadeAlpha((done - COUNT_WHOLE) / (1 - COUNT_WHOLE));
}
