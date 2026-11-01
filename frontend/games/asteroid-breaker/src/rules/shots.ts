// The ship's shots: fired from its nose by the weapon in hand, flown
// straight across the wrap until they fade, and swept as segments against
// circles, so none passes through a rock between two steps.

import { RADIANS_PER_DEGREE } from "./angles";
import { WEAPONS, type WeaponId } from "./catalog/weapons";
import { type Flight, type Ship, TUNED_FLIGHT } from "./ship";
import { stepsIn } from "./stepper";
import { type Torus, across, wrap } from "./torus";
import {
  SHIP_LENGTH,
  SHOTS_CARRY_SHIP,
  SHOT_EVERY_MS,
  SHOT_LIFE_MS,
  SHOT_RADIUS,
  SHOT_SPEED,
  STEP_S,
} from "./tuning";

/** The share of its step returned for a shot that comes within reach of nothing. */
export const MISSED = Number.POSITIVE_INFINITY;

/** Describes a shot, flown in place in its slot. */
export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /**
   * Where it was a step ago, which it is swept from. A step that wraps
   * leaves it a field's width or height away, so the scene draws between
   * the two the shortest way, as it does the ship's.
   */
  lastX: number;
  lastY: number;
  /**
   * The steps it has left to fly, counted down as each starts, so it flies
   * as many as it is given, the one it is fired in among them; 0 frees its
   * slot.
   */
  lifeSteps: number;
  /** The weapon that fired it, whose most in flight it counts toward. */
  weapon: WeaponId;
  /** The rocks it may still break, flying on through each but the last. */
  breaksLeft: number;
}

/** Describes the ship's shots: a slot for each it can have in flight, made once, and the time until it can fire again. */
export interface Shots {
  /**
   * A slot for each shot every weapon can have in flight at once, so a pull
   * that fits its own weapon's most finds slots, whatever the weapons before
   * it left flying.
   */
  readonly slots: readonly Shot[];
  /** The steps until the weapon in hand can fire again, 0 when it can. */
  reloadSteps: number;
}

/** Describes how the shots fly and fire: the numbers the debug menu tunes in flight. */
export interface Gunnery {
  /** How fast a shot flies, before the ship's velocity is added, in units a second. */
  readonly shotSpeed: number;
  /** The time between the gun's pulls; every weapon's scales with it, so Rapid's stays half of it. */
  readonly gunEveryMs: number;
  /** Whether a shot leaves with the ship's velocity added to its own. */
  readonly carryShip: boolean;
}

/** The gunnery `tuning.ts` gives, which every check fires. */
export const TUNED_GUNNERY: Gunnery = {
  shotSpeed: SHOT_SPEED,
  gunEveryMs: SHOT_EVERY_MS,
  carryShip: SHOTS_CARRY_SHIP,
};

/** How far ahead of the ship's middle its nose is, where its shots leave. */
const NOSE = SHIP_LENGTH / 2;

/** How many slots the shots have: every weapon's most in flight, together. */
const SLOTS = Object.values(WEAPONS).reduce(
  (slots, weapon) => slots + weapon.inFlight,
  0,
);

/** Returns the ship's shots, none in flight and the weapon ready. */
export function createShots(): Shots {
  return {
    slots: Array.from({ length: SLOTS }, () => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      lastX: 0,
      lastY: 0,
      lifeSteps: 0,
      weapon: "gun",
      breaksLeft: 0,
    })),
    reloadSteps: 0,
  };
}

/**
 * Steps a ship's shots: each in flight flies on and wraps, or fades as its
 * time runs out, and a pull of the weapon in hand fires if fire is held, the
 * ship isn't waiting, the weapon is ready and the whole pull fits within
 * its most in flight, which only its own shots count toward.
 *
 * Step the ship first: a pull leaves from where its nose is now, and flies
 * its first step at once. A shot carries the ship's velocity only up to its
 * flight's top speed, so a dash throws the ship but not its shots.
 */
export function stepShots(
  shots: Shots,
  ship: Readonly<Ship>,
  fire: boolean,
  weaponId: WeaponId,
  torus: Torus,
  gunnery: Gunnery = TUNED_GUNNERY,
  flight: Flight = TUNED_FLIGHT,
): void {
  if (shots.reloadSteps > 0) shots.reloadSteps -= 1;
  let flying = 0;
  for (const shot of shots.slots) {
    if (shot.lifeSteps === 0) continue;
    shot.lifeSteps -= 1;
    if (shot.lifeSteps === 0) continue;
    flyShot(shot, torus);
    if (shot.weapon === weaponId) flying += 1;
  }
  const weapon = WEAPONS[weaponId];
  if (
    fire &&
    !ship.waiting &&
    shots.reloadSteps === 0 &&
    flying + weapon.count <= weapon.inFlight
  ) {
    pull(shots, ship, weaponId, torus, gunnery, flight);
  }
}

/**
 * Spends a shot on a rock it has met, unless it broke the rock and has
 * breaks left, when it flies on through.
 */
export function landShot(shot: Shot, broke: boolean): void {
  if (broke && shot.breaksLeft > 1) shot.breaksLeft -= 1;
  else shot.lifeSteps = 0;
}

/**
 * Returns how far through its last step a shot first came within reach of a
 * circle, from 0 to 1, else {@link MISSED}: 0 if it began the step there.
 *
 * A circle's radius and a step's travel are far under half the field's
 * short side, as every rock's are, so only the circle's nearest copy across
 * the wrap can be met, and the shot's start is measured from it the
 * shortest way.
 */
export function sweepShot(
  shot: Readonly<Shot>,
  x: number,
  y: number,
  radius: number,
  torus: Torus,
): number {
  const fromX = across(x, shot.lastX, torus.width);
  const fromY = across(y, shot.lastY, torus.height);
  const reach = radius + SHOT_RADIUS;
  const outside = fromX * fromX + fromY * fromY - reach * reach;
  if (outside <= 0) return 0;
  const stepX = shot.vx * STEP_S;
  const stepY = shot.vy * STEP_S;
  // Below 0 while the shot closes on the circle's middle.
  const closing = fromX * stepX + fromY * stepY;
  if (closing >= 0) return MISSED;
  const travel = stepX * stepX + stepY * stepY;
  const square = closing * closing - travel * outside;
  if (square < 0) return MISSED;
  const met = (-closing - Math.sqrt(square)) / travel;
  return met <= 1 ? met : MISSED;
}

/** Fires a pull of a weapon from a ship's nose, fanned about its heading, each shot flying its first step at once. */
function pull(
  shots: Shots,
  ship: Readonly<Ship>,
  weaponId: WeaponId,
  torus: Torus,
  gunnery: Gunnery,
  flight: Flight,
): void {
  const weapon = WEAPONS[weaponId];
  const noseX = wrap(ship.x + Math.cos(ship.angle) * NOSE, torus.width);
  const noseY = wrap(ship.y + Math.sin(ship.angle) * NOSE, torus.height);
  let carry = gunnery.carryShip ? 1 : 0;
  const speed = Math.hypot(ship.vx, ship.vy);
  if (speed > flight.topSpeed) carry *= flight.topSpeed / speed;
  const apart = weapon.spreadDeg * RADIANS_PER_DEGREE;
  let fired = 0;
  for (const shot of shots.slots) {
    if (fired === weapon.count) break;
    if (shot.lifeSteps > 0) continue;
    const angle = ship.angle + (fired - (weapon.count - 1) / 2) * apart;
    shot.x = noseX;
    shot.y = noseY;
    shot.vx = Math.cos(angle) * gunnery.shotSpeed + ship.vx * carry;
    shot.vy = Math.sin(angle) * gunnery.shotSpeed + ship.vy * carry;
    shot.lifeSteps = stepsIn(SHOT_LIFE_MS);
    shot.weapon = weaponId;
    shot.breaksLeft = weapon.breaks;
    flyShot(shot, torus);
    fired += 1;
  }
  shots.reloadSteps = stepsIn(
    (weapon.everyMs * gunnery.gunEveryMs) / SHOT_EVERY_MS,
  );
}

/** Flies a shot a step on, wrapping it, and keeps where it was. */
function flyShot(shot: Shot, torus: Torus): void {
  shot.lastX = shot.x;
  shot.lastY = shot.y;
  shot.x = wrap(shot.x + shot.vx * STEP_S, torus.width);
  shot.y = wrap(shot.y + shot.vy * STEP_S, torus.height);
}
