// Static, the charge the pilot's fur holds: the multiplier by its step,
// knocked down a step as the ship takes a hit, and draining once no spark
// has come for a while.

import { multiplierAt } from "@fz/core/math";
import type { FieldEventLog } from "../field/events";
import { stepsIn } from "../stepper";
import type { Place } from "../torus";
import {
  STATIC_DRAIN,
  STATIC_HOLD_MS,
  STATIC_MOST,
  STATIC_STEPS,
  STEP_S,
} from "../tuning";

/**
 * Static's step once it is full, one past the multiplier's last, at which
 * the next dash is a zap.
 */
export const FULL_STEP = STATIC_STEPS.length + 1;

/** Describes the pilot's static as a field holds it, which each step changes in place. */
export interface Charge {
  /** How much static the pilot holds, from 0 to the most the field's sparking holds. */
  level: number;
  /**
   * The step static holds from a while before it drains: the last spark
   * gathered's, or the hit's that last knocked it down, so a hit costs one
   * step and not the drain's below it as well.
   */
  lastSparkAt: number;
}

/**
 * Says how static works, a value the field holds, as it holds its flight,
 * so it can change in play: how much it holds and how fast it drains.
 */
export interface Sparking {
  /** The most static holds: full, at or past the multiplier's last step. */
  readonly most: number;
  /** How fast static drains once it no longer holds, in a second. */
  readonly drain: number;
}

/** How static works, as `tuning.ts` has it. */
export const TUNED_SPARKING: Readonly<Sparking> = {
  most: STATIC_MOST,
  drain: STATIC_DRAIN,
};

/**
 * Describes what of the field static acts on: the charge, how it works,
 * the step the field is on, the ship a step of static is logged at, and the
 * log.
 */
export interface ChargeField {
  readonly charge: Charge;
  readonly sparking: Readonly<Sparking>;
  readonly steps: number;
  readonly ship: Readonly<Place> | null;
  readonly events: FieldEventLog;
}

/** Returns static at a level, no spark gathered yet. */
export function createCharge(level: number): Charge {
  return { level, lastSparkAt: 0 };
}

/**
 * Returns static's step at a level: how many of the multiplier's steps
 * (`STATIC_STEPS`) it has reached, from 0 at ×1, or {@link FULL_STEP} once
 * it is full.
 */
export function stepOf(level: number, sparking: Readonly<Sparking>): number {
  if (level >= sparking.most) return FULL_STEP;
  let step = 0;
  for (const { from } of STATIC_STEPS) if (level >= from) step++;
  return step;
}

/** Returns how many times its points what is scored scores, by static's step at a level. */
export function multiplierOf(level: number): number {
  return multiplierAt(level, STATIC_STEPS);
}

/**
 * Drains static a step's worth, once it has held since the last spark
 * gathered, down to nothing.
 */
export function drainStatic(field: ChargeField): void {
  const { charge, sparking } = field;
  if (charge.level === 0) return;
  if (field.steps - charge.lastSparkAt <= stepsIn(STATIC_HOLD_MS)) return;
  setLevel(field, charge.level - sparking.drain * STEP_S);
}

/**
 * Knocks static down to the foot of the step below the one it is on, as the
 * ship takes a hit: from full to the multiplier's last step, and on the
 * first step to nothing. It holds there as long as after a spark before it
 * drains on.
 */
export function knockStaticDown(field: ChargeField): void {
  const { charge, sparking } = field;
  const on =
    charge.level >= sparking.most
      ? sparking.most
      : highestFrom((from) => from <= charge.level);
  setLevel(
    field,
    highestFrom((from) => from < on),
  );
  charge.lastSparkAt = field.steps;
}

/**
 * Returns the highest level one of the multiplier's steps starts from of
 * those a test passes, or nothing for none.
 */
function highestFrom(passes: (from: number) => boolean): number {
  let highest = 0;
  for (const { from } of STATIC_STEPS) {
    if (passes(from)) highest = Math.max(highest, from);
  }
  return highest;
}

/**
 * Sets static's level, kept from nothing to the most, and logs a step it
 * comes to at the ship, rising or falling.
 */
function setLevel(field: ChargeField, level: number): void {
  const { charge, sparking, ship } = field;
  const before = stepOf(charge.level, sparking);
  charge.level = Math.min(Math.max(level, 0), sparking.most);
  const after = stepOf(charge.level, sparking);
  if (after !== before && ship !== null) {
    field.events.addStep(ship.x, ship.y, after, after < before);
  }
}
