// A wave in play: the ship, its shots, the rocks and the pickups, stepped
// in place from records made once, as Brick Breaker's field is.

import type { RockKindId } from "./catalog/rocks";
import type { WeaponId } from "./catalog/weapons";
import { type DropSetup, createPickups } from "./drops";
import { FieldEventLog } from "./events";
import {
  type Effects,
  clearPickups,
  createEffects,
  endEffect,
  endEffects,
  stepEffects,
  stepPickups,
} from "./pickups";
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
  guardShip,
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
import { type Torus, across, distanceSquared } from "./torus";
import { PICKUP_PULL_REACH, SHIELD_GUARD_MS, SHIP_HIT_RADIUS } from "./tuning";

/**
 * Says how a wave is played: its field's size and cap, the seed its draws
 * come from, its pace, the kind of rock it names and the pickups it lets go.
 */
export interface FieldSetup extends DropSetup {
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
  readonly setup: FieldSetup;
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
  /** The effects in play, one of each group. */
  readonly effects: Effects;
  /** Whether a Shield guards the ship from the next rock to touch it. */
  shielded: boolean;
  /** How near the ship a pickup is drawn in to it from. */
  pullReach: number;
  /**
   * How many ships it has lost, counting up, for the run to take one for
   * each it hasn't yet.
   */
  shipsLost: number;
  /**
   * How many ships its pickups have given, counting up, for the run to add
   * one for each it hasn't yet.
   */
  shipsGained: number;
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
    setup,
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
    pickups: createPickups(),
    lastDropAt: 0,
    effects: createEffects(),
    shielded: false,
    pullReach: PICKUP_PULL_REACH,
    shipsLost: 0,
    shipsGained: 0,
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
 * Moves the field on by a step: blasts due go off and effects whose time is
 * up end, the ship flies by the frame's steering and fires, its shots and
 * the rocks fly, each shot meets the first rock in its way, a rock takes a
 * ship it touches that isn't guarded, or breaks on its shield, and the
 * pickups float on, the ship catching those it touches. Once no rock is
 * left, the wave is cleared: its effects end, its pickups go, and
 * everything else stands still where it is.
 */
export function stepField(field: Field): void {
  if (field.cleared) return;
  field.steps += 1;
  setOffBlasts(field);
  stepEffects(field);
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
  if (ship) meetRocks(field, ship);
  stepPickups(field);
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

/**
 * Lets the first whole rock to touch a ship that isn't guarded take it, or,
 * while it is shielded, break a size down on the shield, which goes, the
 * ship kept untouchable a while so the pieces can fly clear.
 */
function meetRocks(field: Field, ship: Ship): void {
  const rock = touching(field, ship);
  if (rock === null) return;
  if (!field.shielded) {
    loseShip(field, ship);
    return;
  }
  const { torus } = field;
  endEffect(field, "guard");
  guardShip(ship, SHIELD_GUARD_MS);
  field.events.add("shielded", ship.x, ship.y);
  hitRock(
    field,
    rock,
    across(ship.x, rock.x, torus.width),
    across(ship.y, rock.y, torus.height),
    "breaks",
  );
}

/** Returns the first whole rock that touches a ship that isn't guarded, or null for none. */
function touching(field: Field, ship: Readonly<Ship>): Rock | null {
  if (isGuarded(ship)) return null;
  for (const rock of field.rocks) {
    if (!rock.live) continue;
    const reach = SHIP_HIT_RADIUS + rockHitRadius(rock.size);
    const apart = distanceSquared(field.torus, ship.x, ship.y, rock.x, rock.y);
    if (apart <= reach * reach) return rock;
  }
  return null;
}

/**
 * Loses the field's ship, which its shots in flight outlive, and with it
 * every effect and the pickups floating.
 */
function loseShip(field: Field, ship: Readonly<Ship>): void {
  field.events.add("lost", ship.x, ship.y);
  field.ship = null;
  field.shipsLost += 1;
  endEffects(field);
  clearPickups(field);
}

/**
 * Clears the wave, ending its effects and letting its pickups go, and sets
 * where everything else moving was a step ago to where it is, so a cleared
 * field is drawn standing still.
 */
function clear(field: Field): void {
  field.cleared = true;
  endEffects(field);
  clearPickups(field);
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
