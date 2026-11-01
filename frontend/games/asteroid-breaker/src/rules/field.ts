// A wave in play: the ship, its shots and the rocks, stepped in place from
// records made once, as Brick Breaker's field is.

import type { RockKindId } from "./catalog/rocks";
import type { WeaponId } from "./catalog/weapons";
import { FieldEventLog } from "./events";
import {
  type Rock,
  type RockField,
  createRocks,
  hitRock,
  rockHitRadius,
  rocksLeft,
  setOffBlasts,
  stepRocks,
} from "./rocks";
import {
  type Flight,
  STILL,
  type Ship,
  type Steer,
  TUNED_FLIGHT,
  createShip,
  flyShip,
  isGuarded,
} from "./ship";
import {
  type Gunnery,
  MISSED,
  type Shot,
  type Shots,
  TUNED_GUNNERY,
  createShots,
  landShot,
  stepShots,
  sweepShot,
} from "./shots";
import { type Torus, distanceSquared } from "./torus";
import { SHIP_HIT_RADIUS } from "./tuning";

/** Says how a wave is played: its field's size and cap, the seed its draws come from, its pace and the kind of rock it names. */
export interface FieldSetup {
  readonly torus: Torus;
  /** The most rocks the field holds at once. */
  readonly cap: number;
  readonly seed: number;
  /** How fast its rocks go against their own speed: the wave's pace and the speed's together. */
  readonly pace: number;
  /** The kind of rock it names, which a boulder breaks into. */
  readonly waveKind: RockKindId;
}

/** Describes a wave in play, which each step changes in place. */
export interface Field extends RockField {
  /** The ship in play, or null once it is lost, until the next comes. */
  ship: Ship | null;
  readonly shots: Shots;
  /** The weapon in hand. */
  weapon: WeaponId;
  /** How the ship flies, which the debug menu tunes in play. */
  flight: Flight;
  /** How its shots fly and fire, which the debug menu tunes in play. */
  gunnery: Gunnery;
  /** The frame's steering, which each step until the next frame follows. */
  readonly steer: Steer;
  pace: number;
  steps: number;
  draws: number;
  /**
   * How many ships it has lost, counting up, for the run to take one for
   * each it hasn't yet.
   */
  shipsLost: number;
  /** Whether every rock it held is gone, after which everything stands still. */
  cleared: boolean;
}

/**
 * Returns a wave's field, its rocks' slots free and its ship waiting in its
 * middle for the player's first move; the wave lays its rocks after.
 */
export function createField(setup: FieldSetup): Field {
  const { torus } = setup;
  return {
    torus,
    rocks: createRocks(setup.cap),
    waveKind: setup.waveKind,
    ship: createShip(torus.width / 2, torus.height / 2, STILL),
    shots: createShots(),
    weapon: "gun",
    flight: TUNED_FLIGHT,
    gunnery: TUNED_GUNNERY,
    steer: { ...STILL },
    pace: setup.pace,
    steps: 0,
    seed: setup.seed,
    draws: 0,
    shipsLost: 0,
    cleared: false,
    events: new FieldEventLog(),
  };
}

/** Takes a frame's steering, which the steps until the next frame follow. */
export function steerField(field: Field, steer: Readonly<Steer>): void {
  field.steer.turn = steer.turn;
  field.steer.heading = steer.heading;
  field.steer.aim = steer.aim;
  field.steer.thrust = steer.thrust;
  field.steer.fire = steer.fire;
  field.steer.dash = steer.dash;
}

/**
 * Moves the field on by a step: blasts due go off, the ship flies by the
 * frame's steering and fires, its shots and the rocks fly, each shot meets
 * the first rock in its way, and a rock takes a ship it touches that isn't
 * guarded. Once no rock is left, the wave is cleared, and everything stands
 * still where it is.
 */
export function stepField(field: Field): void {
  if (field.cleared) return;
  field.steps += 1;
  setOffBlasts(field);
  const { ship, steer, torus } = field;
  if (ship && flyShip(ship, steer, torus, field.flight)) {
    field.events.add("dashed", ship.x, ship.y);
  }
  const fired = stepShots(
    field.shots,
    ship,
    steer.fire,
    field.weapon,
    torus,
    field.gunnery,
    field.flight,
  );
  if (ship && fired) field.events.add("fired", ship.x, ship.y);
  stepRocks(field);
  for (const shot of field.shots.slots) {
    if (shot.lifeSteps === 0) continue;
    const rock = firstMet(field, shot);
    if (rock) {
      landShot(shot, hitRock(field, rock, shot.vx, shot.vy), field.steps);
    }
  }
  if (ship && isTaken(field, ship)) loseShip(field, ship);
  if (rocksLeft(field) === 0) clear(field);
}

/**
 * Returns the whole rock a shot met first in its last step, or null for
 * none; a shot that has flown on through rocks passes what was laid in
 * those steps, their pieces.
 */
function firstMet(field: Field, shot: Readonly<Shot>): Rock | null {
  let first: Rock | null = null;
  let soonest = MISSED;
  for (const rock of field.rocks) {
    if (!rock.live || shot.passedAt.includes(rock.laidAt)) continue;
    const met = sweepShot(
      shot,
      rock.x,
      rock.y,
      rockHitRadius(rock.size),
      field.torus,
    );
    if (met < soonest) {
      first = rock;
      soonest = met;
    }
  }
  return first;
}

/** Returns whether a whole rock touches a ship that isn't guarded. */
function isTaken(field: Field, ship: Readonly<Ship>): boolean {
  if (isGuarded(ship)) return false;
  for (const rock of field.rocks) {
    if (!rock.live) continue;
    const reach = SHIP_HIT_RADIUS + rockHitRadius(rock.size);
    const apart = distanceSquared(field.torus, ship.x, ship.y, rock.x, rock.y);
    if (apart <= reach * reach) return true;
  }
  return false;
}

/** Loses the field's ship, which its shots in flight outlive. */
function loseShip(field: Field, ship: Readonly<Ship>): void {
  field.events.add("lost", ship.x, ship.y);
  field.ship = null;
  field.shipsLost += 1;
}

/**
 * Clears the wave, and sets where everything moving was a step ago to where
 * it is, so a cleared field is drawn standing still.
 */
function clear(field: Field): void {
  field.cleared = true;
  const { ship, torus } = field;
  field.events.add("cleared", torus.width / 2, torus.height / 2);
  if (ship) {
    ship.lastX = ship.x;
    ship.lastY = ship.y;
    ship.lastAngle = ship.angle;
  }
  for (const shot of field.shots.slots) {
    shot.lastX = shot.x;
    shot.lastY = shot.y;
  }
}
