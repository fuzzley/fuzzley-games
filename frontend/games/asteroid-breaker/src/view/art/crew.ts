// The crew on the field beside the pilot at the controls: each who rides in
// tow behind the pod, in a bubble of its own on the line, and each a hit
// knocked loose, flying off as it swells to a stray's size and blinking
// through its last seconds before it floats home. What each shows is read
// from the field, as the pilot's own face is (`faces.ts`), so the painter
// only draws it.

import { easeOutCubic } from "@fz/core/math";
import type { FuzzballFace } from "@fz/style/fuzzball";
import { type Loose, stepsLeftOf } from "../../rules/hazards/loose";
import { stepsIn } from "../../rules/stepper";
import { type Moving, type Torus, across } from "../../rules/torus";
import { LOOSE_SWELL_MS, STRAY_RADIUS } from "../../rules/tuning";
import type { FieldView } from "../field/frame";
import { nearestThreat } from "../field/near";
import {
  FACE_MS,
  type FaceMoments,
  WATCH_REACH,
  adriftFaceOf,
  isBlinking,
} from "./faces";

/**
 * The radius of a bubble in tow, in field units, as the plan has it: its
 * rim a fifth of a unit from the next one's, as the line's links are 1.6
 * apart (`TOW_LINK`).
 */
export const TOW_RADIUS = 0.7;

/**
 * How far past its bubble's rim the one riding in tow startles at a rock or
 * a comet passing, in field units.
 */
export const STARTLE_REACH = 1;

/** How long before one knocked loose floats home it blinks, in milliseconds, as the plan has it. */
export const LOOSE_BLINK_MS = 2000;

/**
 * How far a bubble's pilot may reach past its middle, as a share of the
 * bubble's radius, low in it and bobbing: as far as the scene draws its
 * copies past the field's edges.
 */
export const BUBBLE_REACH = 1.25;

/** The times above, and the faces', in the field's steps, made once. */
const IN_STEPS = {
  swell: stepsIn(LOOSE_SWELL_MS),
  blink: stepsIn(LOOSE_BLINK_MS),
  eep: stepsIn(FACE_MS.eep),
  happy: stepsIn(FACE_MS.happy),
} as const;

/**
 * Returns the face the one riding a place in the line in tow shows, the
 * first nearest the pod, as the field stands: over a cleared wave, or a
 * while after one of the crew is brought aboard, happy; a while after one
 * is knocked loose, or while a rock or a comet passes close
 * ({@link STARTLE_REACH}), eep; while the pod waits, sleepy; now and then,
 * where motion is welcome, a blink; else rest.
 *
 * The moments are those the pilot at the controls answers (`hearFace()`).
 */
export function towFaceOf(
  field: FieldView,
  link: number,
  moments: Readonly<FaceMoments>,
  motion: boolean,
): FuzzballFace {
  const { steps } = field;
  if (field.cleared || steps - moments.cheeredAt < IN_STEPS.happy) {
    return "happy";
  }
  if (steps - moments.knockedAt < IN_STEPS.eep || isStartled(field, link)) {
    return "eep";
  }
  if (field.ship?.waiting) return "sleepy";
  const pilot = field.crew.tow[link] ?? 0;
  return isBlinking(steps, pilot, motion) ? "blink" : "rest";
}

/**
 * Writes the way the one riding a place in the line in tow looks into a
 * record and returns it, a unit long: at the nearest rock or comet within
 * `WATCH_REACH` of its bubble, else at the one ahead of it, or, the first,
 * at the pod; still, with no pod or no one riding there.
 */
export function towLookOf(
  field: FieldView,
  link: number,
  into: Moving,
): Moving {
  const { ship, torus } = field;
  const at = ridingAt(field, link);
  const ahead = link === 0 ? ship : ridingAt(field, link - 1);
  if (!ship || !at || !ahead) {
    into.x = 0;
    into.y = 0;
    return into;
  }
  if (nearestThreat(field, at, TOW_RADIUS, WATCH_REACH, into) < Infinity) {
    return into;
  }
  const dx = across(at.x, ahead.x, torus.width);
  const dy = across(at.y, ahead.y, torus.height);
  const far = Math.hypot(dx, dy);
  into.x = far > 0 ? dx / far : 0;
  into.y = far > 0 ? dy / far : 0;
  return into;
}

/**
 * Returns the radius of the bubble of one knocked loose, at a step: a
 * bubble in tow's as it is knocked loose, swelling to a stray's as it flies
 * off, by the time the rules let it be caught again (`LOOSE_SWELL_MS`).
 */
export function looseRadius(loose: Readonly<Loose>, steps: number): number {
  const swelled = Math.min(1, (steps - loose.knockedAt) / IN_STEPS.swell);
  return TOW_RADIUS + (STRAY_RADIUS - TOW_RADIUS) * easeOutCubic(swelled);
}

/**
 * Returns whether one knocked loose is in a fright at a step, wide eyed and
 * its fur stood out: for a while after it was knocked loose.
 */
export function isLooseFrightened(
  loose: Readonly<Loose>,
  steps: number,
): boolean {
  return steps - loose.knockedAt < IN_STEPS.eep;
}

/**
 * Returns the face one knocked loose shows at a step: in a fright, eep;
 * then pleading to be caught, as a stray adrift does, blinking now and
 * then where motion is welcome.
 */
export function looseFaceOf(
  loose: Readonly<Loose>,
  steps: number,
  motion: boolean,
): FuzzballFace {
  return isLooseFrightened(loose, steps)
    ? "eep"
    : adriftFaceOf(steps, loose.pilot, motion);
}

/**
 * Writes the way one knocked loose, drawn at a place, looks into a record
 * and returns it, a unit long: at the pod where it is drawn, the short way
 * across the wrap, or the way it flies with no pod or one right there.
 */
export function looseLookOf(
  loose: Readonly<Pick<Loose, "wayX" | "wayY">>,
  at: Readonly<Moving>,
  pod: Readonly<Moving> | null,
  torus: Torus,
  into: Moving,
): Moving {
  const dx = pod ? across(at.x, pod.x, torus.width) : 0;
  const dy = pod ? across(at.y, pod.y, torus.height) : 0;
  const far = Math.hypot(dx, dy);
  into.x = far > 0 ? dx / far : loose.wayX;
  into.y = far > 0 ? dy / far : loose.wayY;
  return into;
}

/**
 * Returns whether one knocked loose blinks at a step: through its last
 * {@link LOOSE_BLINK_MS} before it floats home.
 */
export function looseBlinks(loose: Readonly<Loose>, steps: number): boolean {
  return stepsLeftOf(loose, steps) <= IN_STEPS.blink;
}

/**
 * Returns whether a rock or a comet passes within {@link STARTLE_REACH} of
 * the rim of the bubble riding a place in the line in tow.
 */
function isStartled(field: FieldView, link: number): boolean {
  const at = ridingAt(field, link);
  if (!at) return false;
  return nearestThreat(field, at, TOW_RADIUS, STARTLE_REACH, null) < Infinity;
}

/**
 * Returns the link of a place in the line in tow one of the crew rides, or
 * undefined for a place no one rides, whose link lies where it was last
 * laid.
 */
function ridingAt(
  field: Pick<FieldView, "tow" | "crew">,
  link: number,
): Readonly<Moving> | undefined {
  return link < field.crew.tow.length ? field.tow[link] : undefined;
}
