// The crew knocked loose: a slot made once for each that can be, one of the
// crew a hit knocked out of the line in tow, flying off from the ship and
// slowing to a stray's drift, wrapping as a rock does, until the ship
// catches it again or it floats home, out of the run.

import type { PickupId } from "../catalog/pickups";
import type { FieldEventLog } from "../field/events";
import { type Crew, type Pilot, goHome, knockLoose } from "../ship/pilots";
import type { Ship } from "../ship/ship";
import { type LineField, hasRoomInTow, joinLine } from "../ship/tow";
import { STEP_MS, stepsIn } from "../stepper";
import {
  type Moving,
  type Torus,
  across,
  distanceSquared,
  pullToward,
  wrap,
} from "../torus";
import {
  LOOSE_LIFE_MS,
  LOOSE_SLOWING_MS,
  LOOSE_SPEED,
  LOOSE_SWELL_MS,
  MOST_CREW,
  PICKUP_PULL_SPEED,
  STEP_S,
  STRAY_CATCH_REACH,
  STRAY_SPEED,
} from "../tuning";

/** The share of its speed past a stray's drift one knocked loose keeps each step. */
const SLOWING_STEP = 0.5 ** (STEP_MS / LOOSE_SLOWING_MS);

/** How many steps one knocked loose is out before it floats home. */
const LIFE_STEPS = stepsIn(LOOSE_LIFE_MS);

/** Describes one of the crew knocked loose, in a slot of its own, stepped in place. */
export interface Loose extends Moving {
  /** Whether it is out on the field, rather than a free slot. */
  live: boolean;
  /** The pilot it is. */
  pilot: Pilot;
  /** Where it was a step ago, for the scene to draw between, across the wrap as a ship's is. */
  lastX: number;
  lastY: number;
  /** The way it flies, a share along each axis. */
  wayX: number;
  wayY: number;
  /** How fast it flies, in units a second, slowing to a stray's drift. */
  speed: number;
  /** The step it was knocked loose at, from which it swells and its time runs. */
  knockedAt: number;
}

/**
 * Describes what the crew knocked loose act on: their slots, the crew they
 * leave and join again, the line in tow, the ship that catches them, a
 * Magnet's pull, the step, and the log.
 */
export interface LooseField extends LineField {
  readonly loose: readonly Loose[];
  readonly steps: number;
  /** The effects in play, of which a Magnet draws one knocked loose in. */
  readonly effects: { readonly pull: { readonly pickup: PickupId | null } };
  /** How near the ship one knocked loose is drawn in to it from. */
  readonly pullReach: number;
  readonly events: FieldEventLog;
}

/** Returns a slot for each of the crew that can be knocked loose at once, none of them out. */
export function createLoose(): Loose[] {
  return Array.from({ length: MOST_CREW - 1 }, () => ({
    live: false,
    pilot: 0,
    x: 0,
    y: 0,
    lastX: 0,
    lastY: 0,
    wayX: 0,
    wayY: 0,
    speed: 0,
    knockedAt: 0,
  }));
}

/**
 * Knocks the last in tow loose from the line, flying off from where it rode
 * straight away from the ship, and returns its pilot; with every slot
 * taken, the one knocked loose longest ago floats home to make room.
 *
 * @throws {RangeError} For a crew with no one in tow, or more in tow than
 *   the line has links.
 */
export function knockLastLoose(field: LooseField, ship: Readonly<Ship>): Pilot {
  const pilot = field.crew.tow.at(-1);
  const link = field.tow[field.crew.tow.length - 1];
  if (pilot === undefined || !link) {
    throw new RangeError("No one in tow can be knocked loose.");
  }
  field.crew = knockLoose(field.crew);
  const slot = freeSlot(field);
  const { torus } = field;
  const wayX = across(ship.x, link.x, torus.width);
  const wayY = across(ship.y, link.y, torus.height);
  const way = Math.hypot(wayX, wayY);
  slot.live = true;
  slot.pilot = pilot;
  slot.x = link.x;
  slot.y = link.y;
  slot.lastX = link.x;
  slot.lastY = link.y;
  // A link on the ship's middle flies off the way its tail points.
  slot.wayX = way > 0 ? wayX / way : -Math.cos(ship.angle);
  slot.wayY = way > 0 ? wayY / way : -Math.sin(ship.angle);
  slot.speed = LOOSE_SPEED;
  slot.knockedAt = field.steps;
  return pilot;
}

/**
 * Moves the crew knocked loose on a step: one whose time is up floats home,
 * one within a Magnet's reach of the ship is drawn in toward it the short
 * way across the wrap, any other flies on, slowing to a stray's drift and
 * wrapping, and the ship catches one that touches it once it has swelled,
 * guarded or not.
 */
export function stepLoose(field: LooseField): void {
  const { ship, torus } = field;
  for (const loose of field.loose) {
    if (!loose.live) continue;
    loose.lastX = loose.x;
    loose.lastY = loose.y;
    if (stepsLeftOf(loose, field.steps) <= 0) {
      floatHome(field, loose);
      continue;
    }
    if (ship === null || !pullIn(field, loose, ship)) fly(loose, torus);
    if (
      ship !== null &&
      field.steps - loose.knockedAt >= stepsIn(LOOSE_SWELL_MS) &&
      reaches(loose, ship, torus)
    ) {
      catchAgain(field, loose);
    }
  }
}

/** Returns how many steps one knocked loose has left at a step before it floats home, 0 or less once it is due to. */
export function stepsLeftOf(loose: Readonly<Loose>, steps: number): number {
  return LIFE_STEPS - (steps - loose.knockedAt);
}

/** Floats every one of the crew knocked loose home, as the run ends. */
export function floatAllHome(field: LooseField): void {
  for (const loose of field.loose) {
    if (loose.live) floatHome(field, loose);
  }
}

/** Takes every one of the crew knocked loose back, as the wave is cleared, as the ship catching it would. */
export function takeAllBack(field: LooseField): void {
  for (const loose of field.loose) {
    if (loose.live) catchAgain(field, loose);
  }
}

/**
 * Returns a crew with every one of the crew knocked loose gone home, for
 * storage to keep, so the page going away gives none of them back.
 */
export function withLooseGoneHome(
  crew: Crew,
  field: Pick<LooseField, "loose">,
): Crew {
  let gone = crew;
  for (const loose of field.loose) {
    if (loose.live) gone = goHome(gone, loose.pilot);
  }
  return gone;
}

/** Returns the pilots of the crew knocked loose, whose colors a stray sent skips. */
export function loosePilots(field: Pick<LooseField, "loose">): Pilot[] {
  return field.loose.filter((loose) => loose.live).map((loose) => loose.pilot);
}

/**
 * Catches one knocked loose again: back at the line in tow's end, laid
 * there, or, with the most in tow, home, out of the run.
 */
function catchAgain(field: LooseField, loose: Loose): void {
  if (!hasRoomInTow(field)) {
    floatHome(field, loose);
    return;
  }
  loose.live = false;
  joinLine(field, loose.pilot);
  field.events.addPilot("recaught", loose.x, loose.y, loose.pilot, field.crew);
}

/** Returns a free slot for one knocked loose, floating the one knocked loose longest ago home if none is free. */
function freeSlot(field: LooseField): Loose {
  let longest: Loose | undefined;
  for (const loose of field.loose) {
    if (!loose.live) return loose;
    if (!longest || loose.knockedAt < longest.knockedAt) longest = loose;
  }
  if (!longest) {
    throw new RangeError("The field has no slot for the crew knocked loose.");
  }
  floatHome(field, longest);
  return longest;
}

/** Floats one knocked loose home, out of the run. */
function floatHome(field: LooseField, loose: Loose): void {
  loose.live = false;
  field.crew = goHome(field.crew, loose.pilot);
  field.events.addPilot("floated", loose.x, loose.y, loose.pilot, field.crew);
}

/**
 * Draws one knocked loose a step in toward the ship the short way across
 * the wrap, while a Magnet is in effect and the ship is within its reach,
 * and returns whether it did.
 */
function pullIn(
  field: LooseField,
  loose: Loose,
  ship: Readonly<Ship>,
): boolean {
  if (field.effects.pull.pickup === null) return false;
  return pullToward(
    loose,
    ship,
    field.pullReach,
    PICKUP_PULL_SPEED * STEP_S,
    field.torus,
  );
}

/** Flies one knocked loose a step on its way, slowing toward a stray's drift, across the wrap. */
function fly(loose: Loose, torus: Torus): void {
  loose.speed = STRAY_SPEED + (loose.speed - STRAY_SPEED) * SLOWING_STEP;
  loose.x = wrap(loose.x + loose.wayX * loose.speed * STEP_S, torus.width);
  loose.y = wrap(loose.y + loose.wayY * loose.speed * STEP_S, torus.height);
}

/** Returns whether one knocked loose is near enough the ship's middle to be caught. */
function reaches(
  loose: Readonly<Loose>,
  ship: Readonly<Ship>,
  torus: Torus,
): boolean {
  const apart = distanceSquared(torus, loose.x, loose.y, ship.x, ship.y);
  return apart <= STRAY_CATCH_REACH * STRAY_CATCH_REACH;
}
