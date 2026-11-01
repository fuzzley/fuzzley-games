// A wave in play: the ship, its shots, the rocks, the pickups, the strays
// and the comets, stepped in place from records made once, as Brick
// Breaker's field is.

import type { RockKindId } from "./catalog/rocks";
import type { WeaponId } from "./catalog/weapons";
import { type DropSetup, createPickups } from "./drops";
import { FieldEventLog } from "./events";
import {
  type Comets,
  type HazardSetup,
  type Strays,
  clearHazards,
  createComets,
  createStrays,
  scheduleComet,
  stepComets,
  stepStrays,
  touchesComet,
} from "./hazards";
import {
  type Effects,
  clearPickups,
  createEffects,
  endEffect,
  endEffects,
  stepEffects,
  stepPickups,
} from "./pickups";
import { type Crew, atControls, bailOut } from "./pilots";
import { endChain, gainShipsByPoints, scoreClearing } from "./scoring";
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
 * come from, its pace, the kind of rock it names, the pickups it lets go,
 * what it sends across the field, and the crew, the points banked and the
 * next ship's mark it starts with.
 */
export interface FieldSetup extends DropSetup, HazardSetup {
  readonly torus: Torus;
  /** The most rocks the field holds at once. */
  readonly cap: number;
  readonly seed: number;
  /** How fast its rocks go against their own speed: the wave's pace and the speed's together. */
  readonly pace: number;
  /** The kind of rock it names, which a boulder breaks into. */
  readonly waveKind: RockKindId;
  /** The run's crew as the wave starts. */
  readonly crew: Crew;
  /** The run's points as the wave starts, which the wave's add to. */
  readonly banked: number;
  /** The score the run's next ship comes at, as the wave starts. */
  readonly nextShipAt: number;
}

/** Describes a wave in play, which each step changes in place. */
export interface Field extends RockField {
  readonly setup: FieldSetup;
  /** The field's size, its setup's until a pause stretches it to another shape. */
  torus: Torus;
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
   * Who flies the run's ships and who waits at home, which the wave changes
   * as it loses and gains ships and brings strays home, for the run to take.
   */
  crew: Crew;
  /** How many ships it has lost. */
  shipsLost: number;
  /** The score the run's next ship comes at, which the wave's points move on. */
  nextShipAt: number;
  readonly strays: Strays;
  readonly comets: Comets;
  /** Whether every rock it held is gone, after which everything stands still. */
  cleared: boolean;
}

/**
 * Returns a wave's field, its rocks' slots free, its ship waiting in its
 * middle for the player's first move, and its first comet's time drawn;
 * the wave lays its rocks after.
 */
export function createField(setup: FieldSetup): Field {
  const { torus } = setup;
  const field: Field = {
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
    crew: setup.crew,
    shipsLost: 0,
    score: 0,
    chain: 0,
    lastBreakAt: 0,
    chainPoints: 0,
    nextShipAt: setup.nextShipAt,
    strays: createStrays(),
    comets: createComets(),
    cleared: false,
    events: new FieldEventLog(),
  };
  scheduleComet(field);
  return field;
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
 * the rocks fly, each shot meets the first rock in its way, the comets fly,
 * breaking what they meet, a rock or a comet takes a ship it touches that
 * isn't guarded, or spends its shield, and the pickups and the stray float
 * on, the ship catching those it touches. Once no rock is left, the wave is
 * cleared: its effects end, its pickups, stray and comets go, and
 * everything else stands still where it is.
 *
 * The shots land before the comets fly, so a rock both meet in a step is
 * the shot's, for its points; and the ships the step's points bring come
 * before the ship is tested, as well as after, so one they bring is the
 * run's before a rock can take the last.
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
  stepComets(field);
  gainShipsByPoints(field);
  if (ship) meetDangers(field, ship);
  stepPickups(field);
  stepStrays(field);
  if (rocksLeft(field) === 0) clear(field);
  gainShipsByPoints(field);
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
 * Lets the first whole rock or crossing comet to touch a ship that isn't
 * guarded take it, or, while it is shielded, spend the shield on it: a rock
 * breaks a size down, and a comet, which can't be broken, flies on. The
 * ship is kept untouchable a while after, so a rock's pieces can fly clear.
 */
function meetDangers(field: Field, ship: Ship): void {
  if (isGuarded(ship)) return;
  const rock = touchingRock(field, ship);
  if (rock === null && !touchesComet(field, ship)) return;
  if (!field.shielded) {
    loseShip(field, ship);
    return;
  }
  const { torus } = field;
  endEffect(field, "guard");
  guardShip(ship, SHIELD_GUARD_MS);
  field.events.add("shielded", ship.x, ship.y);
  if (rock === null) return;
  hitRock(
    field,
    rock,
    across(ship.x, rock.x, torus.width),
    across(ship.y, rock.y, torus.height),
    "breaks",
  );
}

/** Returns the first whole rock that touches a ship, or null for none. */
function touchingRock(field: Field, ship: Readonly<Ship>): Rock | null {
  for (const rock of field.rocks) {
    if (!rock.live) continue;
    const reach = SHIP_HIT_RADIUS + rockHitRadius(rock.size);
    const apart = distanceSquared(field.torus, ship.x, ship.y, rock.x, rock.y);
    if (apart <= reach * reach) return rock;
  }
  return null;
}

/**
 * Loses the field's ship, which its shots in flight outlive, its pilot
 * bailing out and the next in line taking the controls, and with it the
 * chain, every effect and the pickups floating.
 */
function loseShip(field: Field, ship: Readonly<Ship>): void {
  field.events.addPilot("lost", ship.x, ship.y, atControls(field.crew));
  field.crew = bailOut(field.crew);
  field.ship = null;
  field.shipsLost += 1;
  endChain(field);
  endEffects(field);
  clearPickups(field);
}

/**
 * Clears the wave, for its clearing's points, ending its effects and
 * letting its pickups, its stray and its comets go, and sets where
 * everything else moving was a step ago to where it is, so a cleared field
 * is drawn standing still.
 */
function clear(field: Field): void {
  field.cleared = true;
  scoreClearing(field);
  endEffects(field);
  clearPickups(field);
  clearHazards(field);
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
