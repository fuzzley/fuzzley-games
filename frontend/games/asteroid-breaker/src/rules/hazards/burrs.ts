// The burrs a wave sends: small prickly seeds, each coming in off an edge
// as a stray does, then wrapping as a rock does, turning toward the ship
// once it is near, until a shot pops it or it touches the ship and clings,
// each one clinging taking a share of the ship's thrust and top speed,
// until a dash shakes them all off. A burr never hits the ship, and only a
// shot pops one: a blast, a vent, a zap and a comet pass it by.

import { clamp } from "@fz/core/math";
import { RADIANS_PER_DEGREE, TURN } from "../angles";
import { type ScoreField, scoreBurr } from "../field/scoring";
import type { Ship } from "../ship/ship";
import { MISSED, type Shot, sweepShot } from "../ship/shots";
import { type ShedField, shedSparksFrom } from "../sparks/sparks";
import { stepsIn } from "../stepper";
import { type Torus, across, wrap } from "../torus";
import {
  BURR_FIRST_MS,
  BURR_NEXT_MS,
  BURR_RADIUS,
  BURR_SIGHT,
  BURR_SLOW,
  BURR_SPEED,
  BURR_TILT,
  BURR_TURN,
  MOST_CLINGING,
  SHIP_HIT_RADIUS,
  STEP_S,
} from "../tuning";
import {
  type Crossing,
  type CrossingField,
  blankCrossing,
  comeIn,
  edgeOf,
  fly,
  isOnField,
  reaches,
} from "./crossing";

/** Says the burrs a wave sends across its field. */
export interface BurrSetup {
  /** How many burrs it sends, one after another. */
  readonly burrs: number;
  /** How many may be adrift at once, which its slots hold. */
  readonly burrsAtOnce: number;
}

/**
 * Says how burrs fly and cling, a value the field holds, as it holds its
 * flight, so it can change in play: how fast one flies, how near the ship
 * it turns toward it from and how fast, how much of the ship's thrust and
 * top speed each one clinging takes, and how many cling at most.
 */
export interface Burring {
  /** How fast a burr flies, in units a second. */
  readonly speed: number;
  /** How near the ship a burr turns toward it from. */
  readonly sight: number;
  /** How fast a burr in sight of the ship turns toward it, in degrees a second. */
  readonly turn: number;
  /** How much of the ship's thrust and top speed each burr clinging takes. */
  readonly slow: number;
  /** The most burrs that cling to the ship at once. */
  readonly most: number;
}

/** How burrs fly and cling, as `tuning.ts` has it. */
export const TUNED_BURRING: Readonly<Burring> = {
  speed: BURR_SPEED,
  sight: BURR_SIGHT,
  turn: BURR_TURN,
  slow: BURR_SLOW,
  most: MOST_CLINGING,
};

/**
 * Describes a burr adrift: crossing onto the field from an edge, without
 * wrapping, until it lies wholly on it, then wrapping as a rock does.
 */
export interface Burr extends Crossing {
  /** Whether it has come wholly onto the field, after which it wraps. */
  wraps: boolean;
}

/** Describes a wave's burrs: those adrift, how many it has sent, and when the next may come. */
export interface Burrs {
  /** A slot for each burr that may be adrift at once, made once. */
  readonly slots: readonly Burr[];
  /** How many the wave has sent, as its setup says. */
  sent: number;
  /** The step the next may come at, once a slot is free. */
  nextAt: number;
}

/**
 * Describes what the burrs act on: the points a burr popped scores and the
 * spark it sheds, the draws and the size it comes in by, its setup, which
 * says how many come, their records, how they fly and cling, and the ship
 * they turn toward and cling to.
 */
export interface BurrField extends ScoreField, ShedField, CrossingField {
  readonly setup: BurrSetup;
  readonly burrs: Burrs;
  readonly burring: Readonly<Burring>;
  readonly ship: Ship | null;
}

/**
 * Returns a wave's burrs, a slot for each that may be adrift at once, none
 * adrift and none sent, the first due {@link BURR_FIRST_MS} into the wave.
 */
export function createBurrs(atOnce: number): Burrs {
  return {
    slots: Array.from({ length: atOnce }, () => ({
      ...blankCrossing(),
      wraps: false,
    })),
    sent: 0,
    nextAt: stepsIn(BURR_FIRST_MS),
  };
}

/**
 * Moves each burr adrift on a step, and sends the next once it is due and
 * a slot is free, still where it comes in until the step after: one coming
 * in flies straight on until it lies wholly on the field, and one that has
 * wraps, turning toward the ship while it is within its sight.
 */
export function stepBurrs(field: BurrField): void {
  const { burrs } = field;
  for (const burr of burrs.slots) {
    if (burr.live) flyBurr(field, burr);
  }
  if (burrs.sent < field.setup.burrs && field.steps >= burrs.nextAt) {
    const free = burrs.slots.find((burr) => !burr.live);
    if (free) sendBurr(field, free);
  }
}

/**
 * Returns the burr a shot met first in its last step, if it met it no
 * later than a share of the step, by default any, else null; one coming in
 * is met only once its middle is on the field, as a stray is reached.
 */
export function burrMetBy(
  field: Pick<BurrField, "burrs" | "torus">,
  shot: Readonly<Shot>,
  by = MISSED,
): Burr | null {
  let first: Burr | null = null;
  let soonest = MISSED;
  for (const burr of field.burrs.slots) {
    if (!burr.live || !isOnField(burr, field.torus)) continue;
    const met = sweepShot(shot, burr.x, burr.y, BURR_RADIUS, field.torus);
    if (met < soonest) {
      first = burr;
      soonest = met;
    }
  }
  return soonest <= by ? first : null;
}

/**
 * Pops a burr a shot met: it goes, scores its points times static's
 * multiplier, and sheds a spark, as a broken rock sheds its own.
 */
export function popBurr(field: BurrField, burr: Burr): void {
  burr.live = false;
  field.events.addBurr("popped", burr.x, burr.y);
  scoreBurr(field, burr.x, burr.y);
  shedSparksFrom(field, burr, burr.heading, 1);
}

/**
 * Has each burr adrift that touches the ship cling to it, but while the
 * ship waits or dashes: one at a time up to the most, past which one that
 * touches it pops, finding no hold, for nothing.
 */
export function clingBurrs(field: BurrField): void {
  const { ship, torus } = field;
  if (ship === null || ship.waiting || ship.dashSteps > 0) return;
  for (const burr of field.burrs.slots) {
    if (
      !burr.live ||
      !reaches(burr, ship, BURR_RADIUS + SHIP_HIT_RADIUS, torus)
    ) {
      continue;
    }
    burr.live = false;
    if (ship.burrs < field.burring.most) {
      ship.burrs += 1;
      field.events.addClung(ship.x, ship.y, ship.burrs);
    } else {
      field.events.addBurr("popped", burr.x, burr.y);
    }
  }
}

/**
 * Shakes every burr clinging to a ship off it, as a dash starts, each
 * popping as it flies off, for nothing, logged at the ship with how many
 * and the way it heads.
 */
export function shakeBurrs(field: Pick<BurrField, "events">, ship: Ship): void {
  if (ship.burrs === 0) return;
  field.events.addShaken(ship.x, ship.y, ship.angle, ship.burrs);
  ship.burrs = 0;
}

/** Lets every burr adrift go, as the wave is cleared. */
export function clearBurrs(field: Pick<BurrField, "burrs">): void {
  for (const burr of field.burrs.slots) burr.live = false;
}

/**
 * Sends a burr in off an edge, into a free slot, and keeps when the next
 * may come.
 */
function sendBurr(field: BurrField, burr: Burr): void {
  const { burrs } = field;
  burrs.sent += 1;
  burrs.nextAt = field.steps + stepsIn(BURR_NEXT_MS);
  comeIn(field, burr, BURR_RADIUS, BURR_TILT);
  burr.wraps = false;
  const at = edgeOf(burr, field.torus);
  field.events.addBurr("burred", at.x, at.y);
}

/**
 * Flies a burr a step on at its speed: straight on, until it lies wholly
 * on the field, from when it wraps, turning toward the ship within its
 * sight.
 */
function flyBurr(field: BurrField, burr: Burr): void {
  const { torus, ship } = field;
  burr.lastX = burr.x;
  burr.lastY = burr.y;
  if (burr.wraps && ship !== null) turnToward(burr, ship, field);
  fly(burr, field.burring.speed);
  if (burr.wraps) {
    burr.x = wrap(burr.x, torus.width);
    burr.y = wrap(burr.y, torus.height);
  } else {
    burr.wraps = liesWhollyOn(burr, torus);
  }
}

/**
 * Turns a burr a step toward the ship, the shortest way across the wrap, by
 * at most its turn, while the ship is within its sight.
 */
function turnToward(
  burr: Burr,
  ship: Readonly<Ship>,
  { torus, burring }: Pick<BurrField, "torus" | "burring">,
): void {
  const wayX = across(burr.x, ship.x, torus.width);
  const wayY = across(burr.y, ship.y, torus.height);
  if (Math.hypot(wayX, wayY) > burring.sight) return;
  const left = across(burr.heading, Math.atan2(wayY, wayX), TURN);
  const most = burring.turn * RADIANS_PER_DEGREE * STEP_S;
  burr.heading = wrap(burr.heading + clamp(left, -most, most), TURN);
}

/** Returns whether a burr lies wholly on the field, its spines' ends and all. */
function liesWhollyOn(burr: Readonly<Burr>, torus: Torus): boolean {
  return (
    burr.x >= BURR_RADIUS &&
    burr.x <= torus.width - BURR_RADIUS &&
    burr.y >= BURR_RADIUS &&
    burr.y <= torus.height - BURR_RADIUS
  );
}
