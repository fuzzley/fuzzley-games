// The stray fuzzballs a wave sends across the field, one at a time, which
// the ship catches by touching: each joins the line in tow, or, with the
// most in tow, goes straight home.

import { RADIANS_PER_DEGREE } from "../angles";
import type { PickupId } from "../catalog/pickups";
import { drawIn, nextDraw } from "../draws";
import { type ScoreField, scoreStray } from "../field/scoring";
import {
  type Crew,
  type Pilot,
  given,
  goHome,
  nextPilot,
} from "../ship/pilots";
import { type LineField, hasRoomInTow, joinLine } from "../ship/tow";
import { stepsIn } from "../stepper";
import { type Place, moveAlong } from "../torus";
import {
  PICKUP_PULL_SPEED,
  STEP_S,
  STRAY_CATCH_REACH,
  STRAY_HOME_POINTS,
  STRAY_POINTS,
  STRAY_NEXT_MS,
  STRAY_RADIUS,
  STRAY_SPEED,
  STRAY_TILT,
  STRAY_TURN,
} from "../tuning";
import { type Loose, loosePilots } from "./loose";
import {
  type Crossing,
  type CrossingField,
  blankCrossing,
  comeIn,
  edgeOf,
  fly,
  hasLeft,
  reaches,
} from "./crossing";

/** Says the strays a wave sends across its field. */
export interface StraySetup {
  /** How many strays it sends, one at a time. */
  readonly strays: number;
  /** How far into the wave its first stray comes, in milliseconds. */
  readonly strayFirstMs: number;
}

/** Describes a stray fuzzball adrift in its bubble, crossing the field on a gentle curve. */
export interface Stray extends Crossing {
  /** The pilot it is, in the color it took as it came in. */
  pilot: Pilot;
  /** How fast its heading turns, in radians a second, either way. */
  turn: number;
}

/** Describes a wave's strays: the one adrift, and when the next comes. */
export interface Strays {
  /** The record of the stray adrift, one at a time. */
  readonly adrift: Stray;
  /** How many the wave has sent. */
  sent: number;
  /** The step the next comes at, while none is adrift and the wave has one left to send. */
  nextAt: number;
  /** How many the ship has caught, each brought home, into the line or straight home. */
  broughtHome: number;
}

/**
 * Describes what the strays act on: the points a stray caught scores, the
 * draws and the size it comes in by, its setup, which says how many come,
 * their records, the ship that catches them, the crew and the line in tow
 * they join, how many ride in tow at most, the crew knocked loose, whose
 * colors a stray sent skips, and a Magnet's pull.
 */
export interface StrayField extends ScoreField, CrossingField, LineField {
  readonly setup: StraySetup;
  readonly strays: Strays;
  crew: Crew;
  readonly loose: readonly Readonly<Loose>[];
  /** How many steps the field has taken, by which the next stray comes. */
  readonly steps: number;
  /** The effects in play, of which a Magnet draws a stray in. */
  readonly effects: { readonly pull: { readonly pickup: PickupId | null } };
  /** How near the ship a stray is drawn in to it from. */
  readonly pullReach: number;
}

/**
 * Returns a wave's strays, none adrift and none sent, the first due a time into
 * it, in milliseconds.
 */
export function createStrays(firstMs: number): Strays {
  return {
    adrift: { ...blankCrossing(), pilot: 0, turn: 0 },
    sent: 0,
    nextAt: stepsIn(firstMs),
    broughtHome: 0,
  };
}

/**
 * Moves the stray adrift on a step, or sends the next once it is due: one
 * within a Magnet's reach of the ship is drawn in toward it, any other
 * crosses on its curve until it has left the field, and the ship catches
 * one that touches it, guarded or not.
 */
export function stepStrays(field: StrayField): void {
  const { strays, ship, torus } = field;
  const stray = strays.adrift;
  if (!stray.live) {
    if (strays.sent < field.setup.strays && field.steps >= strays.nextAt) {
      sendStray(field);
    }
    return;
  }
  stray.lastX = stray.x;
  stray.lastY = stray.y;
  if (ship === null || !pullIn(field, stray, ship)) {
    stray.heading += stray.turn * STEP_S;
    fly(stray, STRAY_SPEED);
    if (hasLeft(stray, STRAY_RADIUS, torus)) {
      strayGone(field);
      return;
    }
  }
  if (ship !== null && reaches(stray, ship, STRAY_CATCH_REACH, torus)) {
    catchStray(field);
  }
}

/** Lets the stray adrift go, as the wave is cleared. */
export function clearStrays(field: Pick<StrayField, "strays">): void {
  field.strays.adrift.live = false;
}

/**
 * Returns the step the next stray comes at once one has gone at a step,
 * caught or off the field.
 */
export function nextStrayAfter(step: number): number {
  return step + stepsIn(STRAY_NEXT_MS);
}

/**
 * Sends a stray in off an edge, in the next color in turn that none of the
 * crew aboard or knocked loose wears, on a curve drawn to one side.
 */
function sendStray(field: StrayField): void {
  const { strays } = field;
  const stray = strays.adrift;
  comeIn(field, stray, STRAY_RADIUS, STRAY_TILT);
  const anticlockwise = nextDraw(field) < 0.5;
  stray.turn =
    (anticlockwise ? -1 : 1) * drawIn(field, STRAY_TURN) * RADIANS_PER_DEGREE;
  stray.pilot = nextPilot(field.crew, loosePilots(field));
  field.crew = given(field.crew, stray.pilot);
  strays.sent += 1;
  const at = edgeOf(stray, field.torus);
  field.events.addPilot("strayed", at.x, at.y, stray.pilot, field.crew);
}

/**
 * Draws the stray a step in toward the ship the straight way, never across
 * an edge, as it doesn't wrap, while a Magnet is in effect and the ship is
 * within its reach that way, and returns whether it did.
 */
function pullIn(
  field: StrayField,
  stray: Stray,
  ship: Readonly<Place>,
): boolean {
  if (field.effects.pull.pickup === null) return false;
  const wayX = ship.x - stray.x;
  const wayY = ship.y - stray.y;
  if (Math.hypot(wayX, wayY) > field.pullReach) return false;
  moveAlong(stray, wayX, wayY, PICKUP_PULL_SPEED * STEP_S);
  return true;
}

/**
 * Catches the stray adrift, bringing it home: it joins the line in tow's
 * end, laid there, for a stray's points, or, with the most in tow, goes
 * straight home, for more.
 */
function catchStray(field: StrayField): void {
  const { strays } = field;
  const stray = strays.adrift;
  const { x, y, pilot } = stray;
  strays.broughtHome += 1;
  if (hasRoomInTow(field)) {
    joinLine(field, pilot);
    field.events.addPilot("joined", x, y, pilot, field.crew);
    scoreStray(field, x, y, STRAY_POINTS);
  } else {
    field.crew = goHome(field.crew, pilot);
    field.events.addPilot("home", x, y, pilot, field.crew);
    scoreStray(field, x, y, STRAY_HOME_POINTS);
  }
  strayGone(field);
}

/** Ends the stray adrift's crossing, the next due a while after. */
function strayGone(field: Pick<StrayField, "strays" | "steps">): void {
  field.strays.adrift.live = false;
  field.strays.nextAt = nextStrayAfter(field.steps);
}
