// The pilot's face, as the art kit's `FACE_USES` says each shows: what
// the field shows of the pod and what happened to it, read the same way by
// the pod's painter and by any other place that shows the pilot. Its look,
// toward what threatens the pod or the way it points, and the push its fur
// leans from, eased, so the fur lags a thrust and settles after.

import type { FuzzballFace } from "@fz/style/fuzzball";
import { reaches } from "../../rules/hazards/crossing";
import { rockHitRadius } from "../../rules/rocks/rocks";
import { multiplier } from "../../rules/field/scoring";
import type { Pilot } from "../../rules/ship/pilots";
import { type Ship, thrustOf } from "../../rules/ship/ship";
import { STEP_MS, stepsIn } from "../../rules/stepper";
import { type Moving, type Torus, across } from "../../rules/torus";
import {
  CHAIN_MS,
  COMET_RADIUS,
  HIT_GUARD_MS,
  SHIP_HIT_RADIUS,
} from "../../rules/tuning";
import type { FieldEvent, FieldView } from "../field/frame";

/**
 * Describes the steps at which what the pilot's face answers for a while
 * last happened, on the field it is held for, each `-Infinity` until it
 * does.
 */
export interface FaceMoments {
  /** The pod brought a stray home, caught one of the crew again, or cleared its wave. */
  cheeredAt: number;
  /** A hit knocked one of the crew loose. */
  knockedAt: number;
  /** A rock or a comet passed within `NEAR_MISS` of the pod, or a Shield took one for it. */
  startledAt: number;
}

/** How far beyond the pod's hit circle a rock or a comet passes for a near miss, in field units. */
export const NEAR_MISS = 0.5;

/** How far beyond the pod's hit circle the pilot keeps an eye on a rock or a comet, in field units. */
export const WATCH_REACH = 6;

/** How long the pilot shows each face that answers what happened, in milliseconds. */
export const FACE_MS = {
  /** Dizzy, after a hit, as long as the pod is untouchable after it. */
  dizzy: HIT_GUARD_MS,
  eep: 600,
  happy: 1200,
} as const;

/**
 * How often a pilot blinks, how long a blink takes and how far each pilot's
 * color sets its blinks after the color before it, in milliseconds, so no
 * two blink together.
 */
export const BLINK_MS = { every: 4000, takes: 160, lag: 700 } as const;

/**
 * How long the fur takes to lean into a push, and to settle once the push
 * lets up, in milliseconds, each the time it closes most of the way, so it
 * lags a thrust.
 */
export const LEAN_MS = { into: 60, settle: 450 } as const;

/** How hard a dash pushes the fur, on the fuzzball's grid, where a full thrust pushes it a unit. */
export const DASH_LEAN = 2;

/** The times above in the field's steps, made once. */
const IN_STEPS = {
  dizzy: stepsIn(FACE_MS.dizzy),
  eep: stepsIn(FACE_MS.eep),
  happy: stepsIn(FACE_MS.happy),
  every: stepsIn(BLINK_MS.every),
  takes: stepsIn(BLINK_MS.takes),
  lag: stepsIn(BLINK_MS.lag),
  chain: stepsIn(CHAIN_MS),
} as const;

/** Returns the moments of a field that has yet to show the pilot any. */
export function createFaceMoments(): FaceMoments {
  return { cheeredAt: -Infinity, knockedAt: -Infinity, startledAt: -Infinity };
}

/** Notes what an event the field logged at a step means for the pilot's face. */
export function hearFace(
  moments: FaceMoments,
  { kind }: Pick<FieldEvent, "kind">,
  steps: number,
): void {
  switch (kind) {
    case "joined":
    case "home":
    case "recaught":
    case "cleared":
      moments.cheeredAt = steps;
      return;
    case "knocked":
      moments.knockedAt = steps;
      return;
    case "shielded":
      moments.startledAt = steps;
      return;
    default:
      return;
  }
}

/** Notes a near miss, a rock or a comet within `NEAR_MISS` of the pod's hit circle as the field stands. */
export function watchFace(moments: FaceMoments, field: FieldView): void {
  if (threatGap(field, null) <= NEAR_MISS) moments.startledAt = field.steps;
}

/**
 * Returns the face the pilot at the controls shows as the field stands:
 * over a cleared wave, happy; in a dash, squeeze; after a hit, dizzy; after
 * a near miss, eep; after a stray brought home, happy; while the pod
 * waits, sleepy; thrusting or firing, set; now and then, where motion is
 * welcome, a blink; else rest.
 *
 * A cleared field steps no more, so whatever held as it cleared would hold
 * until the next wave; the clearing comes first for that.
 */
export function faceOf(
  field: FieldView,
  moments: Readonly<FaceMoments>,
  motion: boolean,
): FuzzballFace {
  const { ship, steps } = field;
  if (!ship) return "rest";
  if (field.cleared) return "happy";
  if (ship.dashSteps > 0) return "squeeze";
  if (steps - moments.knockedAt < IN_STEPS.dizzy) return "dizzy";
  if (steps - moments.startledAt < IN_STEPS.eep) return "eep";
  if (steps - moments.cheeredAt < IN_STEPS.happy) return "happy";
  if (ship.waiting) return "sleepy";
  if (thrustOf(ship) > 0 || ship.held.fire) return "set";
  const pilot = field.crew.pilot ?? 0;
  return isBlinking(steps, pilot, motion) ? "blink" : "rest";
}

/** Returns the face a stray adrift shows: pleading, blinking now and then where motion is welcome. */
export function adriftFaceOf(
  steps: number,
  pilot: Pilot,
  motion: boolean,
): FuzzballFace {
  return isBlinking(steps, pilot, motion) ? "blink" : "plead";
}

/**
 * Returns whether a pilot's eyes are shut in a blink at a step, each
 * pilot's color blinking a while after the color before it, and never
 * where motion isn't welcome.
 */
export function isBlinking(
  steps: number,
  pilot: Pilot,
  motion: boolean,
): boolean {
  if (!motion) return false;
  const late = (steps - pilot * IN_STEPS.lag) % IN_STEPS.every;
  return (late + IN_STEPS.every) % IN_STEPS.every < IN_STEPS.takes;
}

/**
 * Writes the way the pilot at the controls looks into a record and returns
 * it, a unit long: at the nearest rock or comet within `WATCH_REACH` of the
 * pod, else the way the pod points, at an angle, as it is drawn; still,
 * with no pod.
 */
export function lookOf(field: FieldView, angle: number, into: Moving): Moving {
  if (!field.ship) {
    into.x = 0;
    into.y = 0;
  } else if (threatGap(field, into) > WATCH_REACH) {
    into.x = Math.cos(angle);
    into.y = Math.sin(angle);
  }
  return into;
}

/**
 * Returns how far the pilot's fur is lifted, from 0, flat, to 3, on end:
 * the chain's multiplier as the field stands, less one, so it lifts at each
 * of the chain's tiers and falls as the chain's time runs out, or as the
 * wave is cleared, where the bar's multiplier falls too.
 */
export function liftOf({
  chain,
  lastBreakAt,
  steps,
  cleared,
}: FieldView): number {
  const counting = !cleared && steps - lastBreakAt <= IN_STEPS.chain;
  return multiplier(counting ? chain : 0) - 1;
}

/**
 * Writes the push on the pilot's fur into a record and returns it, on the
 * fuzzball's grid, the way the pod is pushed at an angle: a unit at full
 * thrust, `DASH_LEAN` in a dash, nothing while it coasts or waits, over a
 * cleared wave, which stands still, or with no pod.
 */
export function pushOf(field: FieldView, angle: number, into: Moving): Moving {
  const { ship } = field;
  const push =
    !ship || field.cleared
      ? 0
      : ship.dashSteps > 0
        ? DASH_LEAN
        : thrustOf(ship);
  into.x = Math.cos(angle) * push;
  into.y = Math.sin(angle) * push;
  return into;
}

/**
 * Moves the fur's lean toward a push over a number of steps and returns it,
 * fast as the push grows and slowly as it lets up, so the fur lags a
 * thrust and settles after it; all the way at once where motion isn't
 * welcome.
 */
export function easeLean(
  lean: Moving,
  push: Readonly<Moving>,
  steps: number,
  motion: boolean,
): Moving {
  const leaning =
    Math.hypot(push.x, push.y) >= Math.hypot(lean.x, lean.y)
      ? "into"
      : "settle";
  // Most of the way, all but e⁻³ of it, in the time it takes.
  const kept = motion ? Math.exp((-3 * steps * STEP_MS) / LEAN_MS[leaning]) : 0;
  lean.x = push.x + (lean.x - push.x) * kept;
  lean.y = push.y + (lean.y - push.y) * kept;
  return lean;
}

/**
 * Returns how far beyond the pod's hit circle the nearest live rock or
 * crossing comet lies, `Infinity` with none within `WATCH_REACH` of it or
 * no pod, and writes the way to it, a unit long, into a record where one
 * is given.
 */
function threatGap(field: FieldView, way: Moving | null): number {
  const { ship, torus } = field;
  if (!ship) return Infinity;
  let gap = Infinity;
  let nearX = 0;
  let nearY = 0;
  for (const rock of field.rocks) {
    if (!rock.live) continue;
    const beyond = gapTo(ship, torus, rock.x, rock.y, rockHitRadius(rock.size));
    if (beyond < gap) {
      gap = beyond;
      nearX = rock.x;
      nearY = rock.y;
    }
  }
  const watched = COMET_RADIUS + SHIP_HIT_RADIUS + WATCH_REACH;
  for (const comet of field.comets.slots) {
    if (comet.warnSteps > 0 || !comet.live) continue;
    if (!reaches(comet, ship, watched, torus)) continue;
    const beyond = gapTo(ship, torus, comet.x, comet.y, COMET_RADIUS);
    if (beyond < gap) {
      gap = beyond;
      nearX = comet.x;
      nearY = comet.y;
    }
  }
  if (gap > WATCH_REACH) return Infinity;
  if (way) {
    const dx = across(ship.x, nearX, torus.width);
    const dy = across(ship.y, nearY, torus.height);
    const far = Math.hypot(dx, dy);
    way.x = far > 0 ? dx / far : 0;
    way.y = far > 0 ? dy / far : 0;
  }
  return gap;
}

/** Returns how far beyond the pod's hit circle a thing of a radius at a place lies, across the wrap. */
function gapTo(
  ship: Readonly<Ship>,
  torus: Torus,
  x: number,
  y: number,
  radius: number,
): number {
  const dx = across(ship.x, x, torus.width);
  const dy = across(ship.y, y, torus.height);
  return Math.hypot(dx, dy) - radius - SHIP_HIT_RADIUS;
}
