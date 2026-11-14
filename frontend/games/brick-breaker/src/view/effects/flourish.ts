import { clamp, easeOutCubic, fadeAlpha } from "@fz/core/math";
import { mixColors } from "@fz/phaser/color";
import { STEP_MS, stepsIn } from "../../rules/stepper";
import { BRICK_HEIGHT, COLUMNS } from "../../rules/tuning";
import type { FieldView } from "../field/frame";
import { GLOW_AFTER_MS, GLOW_BRICKS, GLOW_PULSE_MS, HOLD_MS } from "./timing";

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

/** How deep the pad dips as a ball meets the paddle, at the deepest, in field units. */
const PAD_DIP = 0.1;

/**
 * Says how a ball's picture is squashed: its width and its height as shares
 * of its own, and how far its middle drops toward the paddle, as a share of
 * its radius.
 */
export interface Squash {
  across: number;
  down: number;
  drop: number;
}

/**
 * How a ball is squashed against the paddle at the deepest, as the art
 * kit's still of the paddle giving draws it: wider and flatter, its middle
 * dropped so its foot presses into the pad.
 */
export const DEEPEST_SQUASH: Readonly<Squash> = {
  across: 1.28,
  down: 0.7,
  drop: 0.35,
};

/**
 * Returns how deep a ball's squash and the pad's dip are, as a share of
 * their deepest, a share through them: deepest as the two meet, holding
 * there a moment, then easing back to nothing.
 */
export function meetDepth(done: number): number {
  return (1 + Math.cos(Math.PI * done)) / 2;
}

/**
 * Writes how a ball's picture is squashed a share through its meeting with
 * the paddle: as {@link DEEPEST_SQUASH} as they meet, round again by its
 * end.
 */
export function squashAt(done: number, squash: Squash): void {
  const depth = meetDepth(done);
  squash.across = 1 + (DEEPEST_SQUASH.across - 1) * depth;
  squash.down = 1 + (DEEPEST_SQUASH.down - 1) * depth;
  squash.drop = DEEPEST_SQUASH.drop * depth;
}

/** Returns how far the pad has dipped, in field units, a share through its dip. */
export function padDip(done: number): number {
  return PAD_DIP * meetDepth(done);
}

/** How far above its place a brick starts as it drops in, in field units. */
export const DROP_IN_HEIGHT = 2 * BRICK_HEIGHT;

/**
 * How much of the drop-in's time each column takes to drop, the rest
 * spread between the columns' starts, the first column's at once.
 */
const COLUMN_DROP = 0.4;

/**
 * Returns how far a column is through its own drop, a share through the
 * bricks' drop-in: each column starting a step after the one to its left,
 * the first at once and the last landing as the drop-in ends.
 */
function columnDropDone(column: number, done: number): number {
  const start = (column / (COLUMNS - 1)) * (1 - COLUMN_DROP);
  return clamp((done - start) / COLUMN_DROP, 0, 1);
}

/**
 * Returns how far above its place a brick in a column stands, in field
 * units, a share through the bricks' drop-in: dropping fast, then slowing
 * as it lands.
 */
export function dropInHeight(column: number, done: number): number {
  return DROP_IN_HEIGHT * (1 - easeOutCubic(columnDropDone(column, done)));
}

/** Returns how opaque a brick in a column is, a share through the bricks' drop-in: fading in as it drops. */
export function dropInAlpha(column: number, done: number): number {
  return easeOutCubic(columnDropDone(column, done));
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

/**
 * Returns the time the flourishes run by, from the scene's: the same until
 * the last brick's hit holds, standing still for {@link HOLD_MS} from when it
 * held, and so far behind after; `heldAt` is Infinity while it hasn't held.
 */
export function flourishTime(time: number, heldAt: number): number {
  return time - clamp(time - heldAt, 0, HOLD_MS);
}

/** Returns whether the last brick's hit holds at a time, from when it held, or Infinity while it hasn't. */
export function isHolding(time: number, heldAt: number): boolean {
  return time >= heldAt && time < heldAt + HOLD_MS;
}
