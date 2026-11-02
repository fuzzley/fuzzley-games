// The ship's flight, a step at a time, from what the player steers it by:
// it turns, thrusts along its heading, coasts, keeps under its top speed and
// wraps, or dashes.

import { RADIANS_PER_DEGREE, TURN } from "./angles";
import { STEP_MS, stepsIn } from "./stepper";
import { type Place, type Torus, across, wrap } from "./torus";
import {
  COAST_HALF_LIFE_MS,
  DASH_CARRY,
  DASH_GUARD_MS,
  DASH_MS,
  DASH_RECHARGE_MS,
  DASH_SPEED,
  HEADING_EASE,
  HEADING_TURN_RATE,
  KEY_TURN_RAMP_MS,
  KEY_TURN_RATE,
  NEW_SHIP_GUARD_MS,
  STEP_S,
  STICK_SLACK,
  THRUST,
  TOP_SPEED,
} from "./tuning";

/** How far the keys' turn ramps in each step they are held. */
const RAMP_STEP = STEP_MS / KEY_TURN_RAMP_MS;

/**
 * Says how the player steers the ship through a frame, written into one
 * record each frame. At most one of the keys' turn, a stick's heading and
 * the mouse's aim turns the ship; the others are 0 and null.
 */
export interface Steer {
  /** The keys' turn, from −1, anticlockwise at their full rate, to 1, clockwise. */
  turn: number;
  /** The heading a stick points the ship toward, in radians, or null. */
  heading: number | null;
  /**
   * The place on the field the mouse points the ship toward, or null. The
   * view keeps the place it found as the pointer last moved, so a still
   * pointer gives the same place every frame, through a resize or a pause's
   * stretch too, and a new place means the mouse moved.
   */
  aim: Place | null;
  /** The push along the heading, from 0 to 1. */
  thrust: number;
  /** Whether fire is held, as "Fire by itself" holds it every frame. */
  fire: boolean;
  /** Whether a dash is asked for; held, it dashes once. */
  dash: boolean;
}

/** Steers nothing. */
export const STILL: Readonly<Steer> = {
  turn: 0,
  heading: null,
  aim: null,
  thrust: 0,
  fire: false,
  dash: false,
};

/** Describes what steered a ship the step before, its own copy of the frame's. */
export interface Held {
  turn: number;
  heading: number | null;
  /** Whether the mouse aimed the ship. */
  aiming: boolean;
  /** The place the mouse aimed at, while it aimed. */
  aimX: number;
  aimY: number;
  thrust: number;
  fire: boolean;
  dash: boolean;
}

/** Describes how the ship flies: the numbers the debug menu tunes in flight. */
export interface Flight {
  /** The push of full thrust, in units a second, each second. */
  readonly thrust: number;
  /** The fastest the ship flies except while it dashes, in units a second. */
  readonly topSpeed: number;
  /** How long the ship's speed takes to halve as it flies, if nothing pushes it. */
  readonly coastHalfLifeMs: number;
  /** How fast held keys turn the ship, in degrees a second. */
  readonly keyTurnRate: number;
  /** The fastest the ship turns toward a stick's heading or the mouse, in degrees a second. */
  readonly headingTurnRate: number;
}

/** The flight `tuning.ts` gives, which every check flies. */
export const TUNED_FLIGHT: Flight = {
  thrust: THRUST,
  topSpeed: TOP_SPEED,
  coastHalfLifeMs: COAST_HALF_LIFE_MS,
  keyTurnRate: KEY_TURN_RATE,
  headingTurnRate: HEADING_TURN_RATE,
};

/** Describes a ship in flight, stepped in place. */
export interface Ship {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Where its nose points. */
  angle: number;
  /**
   * Where it was a step ago, for the scene to draw between. A step that
   * wraps leaves it a field's width or height away, so the scene draws
   * between the two the shortest way, with `across()`.
   */
  lastX: number;
  lastY: number;
  /** Where its nose pointed a step ago, a turn away across 0, as `lastX` is across an edge. */
  lastAngle: number;
  /** How far the keys' turn has ramped in, from 0 to 1. */
  turnRamp: number;
  /** The steps left of a dash's throw, 0 when it isn't dashing. */
  dashSteps: number;
  /** The velocity a dash took over, which the ship keeps once it ends. */
  keptVx: number;
  keptVy: number;
  /** The steps until the dash is charged again, 0 when it is. */
  rechargeSteps: number;
  /** The steps left that nothing can hit it. */
  guardSteps: number;
  /** Whether it waits for the player's first move, untouchable and still. */
  waiting: boolean;
  /**
   * What steered it the step before, so a held press dashes once, a turn
   * ramps in again as it starts or turns round, and only a fresh move ends
   * a wait.
   */
  readonly held: Held;
  /**
   * Where a stick held as it came pointed, which the stick must turn past a
   * slack from to end its wait; 0 when it came with none.
   */
  readonly cameHeading: number;
}

/**
 * Returns a new ship, waiting at a place with its nose up and its dash
 * charged. What the player holds as it comes is no move until it changes:
 * a button or a push until it is let go and given again, the mouse until
 * it moves, and a stick until it turns past a slack.
 */
export function createShip(x: number, y: number, held: Readonly<Steer>): Ship {
  const angle = (3 * Math.PI) / 2;
  const ship: Ship = {
    x,
    y,
    vx: 0,
    vy: 0,
    angle,
    lastX: x,
    lastY: y,
    lastAngle: angle,
    turnRamp: 0,
    dashSteps: 0,
    keptVx: 0,
    keptVy: 0,
    rechargeSteps: 0,
    guardSteps: 0,
    waiting: true,
    held: {
      turn: 0,
      heading: null,
      aiming: false,
      aimX: 0,
      aimY: 0,
      thrust: 0,
      fire: false,
      dash: false,
    },
    cameHeading: held.heading ?? 0,
  };
  hold(ship.held, held);
  return ship;
}

/** Returns whether nothing can hit a ship: while it waits, and while it is guarded. */
export function isGuarded(ship: Readonly<Ship>): boolean {
  return ship.waiting || ship.guardSteps > 0;
}

/** Returns how hard a ship's thrust pushed it in its last step: as hard as it was held, but not at all while it waits or a dash throws it. */
export function thrustOf(ship: Readonly<Ship>): number {
  return ship.waiting || ship.dashSteps > 0 ? 0 : ship.held.thrust;
}

/** Returns how far a ship's dash has recharged, from 0 as it dashes to 1 once it can dash again. */
export function rechargeShare(ship: Readonly<Ship>): number {
  return 1 - ship.rechargeSteps / stepsIn(DASH_RECHARGE_MS);
}

/**
 * Keeps a waiting ship waiting through a frame's steering that doesn't move
 * it afresh, taking the steering as held and leaving its timers as they
 * are, and returns whether it did, as a wave's first ship does while the
 * wave holds still for the player's first move.
 */
export function waitOn(ship: Ship, steer: Readonly<Steer>): boolean {
  if (!ship.waiting || movesAfresh(ship, steer)) return false;
  hold(ship.held, steer);
  return true;
}

/**
 * Keeps a ship untouchable, between steps, for at least a time from the
 * next step on, as the field does as a pause ends.
 */
export function guardShip(ship: Ship, ms: number): void {
  // The next step counts its guard down before anything tests it.
  ship.guardSteps = Math.max(ship.guardSteps, stepsIn(ms) + 1);
}

/**
 * Flies a ship one step by a frame's steering, on a field, and returns
 * whether a dash started in it.
 *
 * Its timers count down as the step starts, so one set in a step counts it:
 * a dash of so many steps throws the ship for that many, the one it starts
 * in among them, and a guard of so many holds through that many tests of
 * what touches it.
 */
export function flyShip(
  ship: Ship,
  steer: Readonly<Steer>,
  torus: Torus,
  flight: Flight = TUNED_FLIGHT,
): boolean {
  ship.lastX = ship.x;
  ship.lastY = ship.y;
  ship.lastAngle = ship.angle;
  countDown(ship);
  if (ship.waiting && movesAfresh(ship, steer)) {
    ship.waiting = false;
    guard(ship, NEW_SHIP_GUARD_MS);
  }
  let dashed = false;
  if (!ship.waiting) {
    turnShip(ship, steer, flight);
    dashed = steer.dash && !ship.held.dash && ship.rechargeSteps === 0;
    if (dashed) startDash(ship);
    if (ship.dashSteps === 0) pushShip(ship, steer.thrust, flight);
    ship.x = wrap(ship.x + ship.vx * STEP_S, torus.width);
    ship.y = wrap(ship.y + ship.vy * STEP_S, torus.height);
  }
  hold(ship.held, steer);
  return dashed;
}

/** Copies a frame's steering into what a ship holds from the step before. */
function hold(held: Held, steer: Readonly<Steer>): void {
  held.turn = steer.turn;
  held.heading = steer.heading;
  held.aiming = steer.aim !== null;
  if (steer.aim) {
    held.aimX = steer.aim.x;
    held.aimY = steer.aim.y;
  }
  held.thrust = steer.thrust;
  held.fire = steer.fire;
  held.dash = steer.dash;
}

/** Counts a ship's timers down a step, ending its dash when the throw is done. */
function countDown(ship: Ship): void {
  if (ship.rechargeSteps > 0) ship.rechargeSteps -= 1;
  if (ship.guardSteps > 0) ship.guardSteps -= 1;
  if (ship.dashSteps > 0) {
    ship.dashSteps -= 1;
    if (ship.dashSteps === 0) endDash(ship);
  }
}

/**
 * Returns whether a frame's steering moves a waiting ship afresh: a keys'
 * turn begun or turned round, a stick's heading begun or turned past the
 * slack from where it pointed as the ship came, the mouse moved, a push
 * begun, or fire or a dash pressed.
 */
function movesAfresh(ship: Readonly<Ship>, steer: Readonly<Steer>): boolean {
  const { held } = ship;
  return (
    (steer.turn !== 0 && Math.sign(steer.turn) !== Math.sign(held.turn)) ||
    (steer.heading !== null && headingMoves(steer.heading, held, ship)) ||
    (steer.aim !== null &&
      (!held.aiming ||
        steer.aim.x !== held.aimX ||
        steer.aim.y !== held.aimY)) ||
    (steer.thrust > 0 && held.thrust === 0) ||
    (steer.fire && !held.fire) ||
    (steer.dash && !held.dash)
  );
}

/**
 * Returns whether a stick's heading moves a waiting ship: begun, or turned
 * past the slack from where it pointed as the ship came, which a heading
 * held since the step before has been held since.
 */
function headingMoves(
  heading: number,
  held: Readonly<Held>,
  ship: Readonly<Ship>,
): boolean {
  if (held.heading === null) return true;
  const turned = Math.abs(across(ship.cameHeading, heading, TURN));
  return turned > STICK_SLACK * RADIANS_PER_DEGREE;
}

/**
 * Turns a ship a step: toward the mouse or a stick's heading, slowing as it
 * nears it, or by the keys, ramped in again whenever their turn starts or
 * turns round.
 */
function turnShip(ship: Ship, steer: Readonly<Steer>, flight: Flight): void {
  const heading = steer.aim ? headingTo(ship, steer.aim) : steer.heading;
  if (heading !== null) {
    turnToward(ship, heading, flight);
    return;
  }
  if (Math.sign(steer.turn) !== Math.sign(ship.held.turn)) ship.turnRamp = 0;
  if (steer.turn === 0) return;
  ship.turnRamp = Math.min(1, ship.turnRamp + RAMP_STEP);
  const turn = steer.turn * flight.keyTurnRate * RADIANS_PER_DEGREE * STEP_S;
  ship.angle = wrap(ship.angle + turn * ship.turnRamp, TURN);
}

/**
 * Returns the heading from a ship to a place on the field, straight as the
 * player sees it rather than across an edge, or null for its own place.
 */
function headingTo(ship: Readonly<Ship>, place: Place): number | null {
  const x = place.x - ship.x;
  const y = place.y - ship.y;
  return x === 0 && y === 0 ? null : Math.atan2(y, x);
}

/** Turns a ship a step toward a heading, slowing within the ease so it comes to it gently. */
function turnToward(ship: Ship, heading: number, flight: Flight): void {
  const left = across(ship.angle, heading, TURN);
  const ease = Math.min(
    1,
    Math.abs(left) / (HEADING_EASE * RADIANS_PER_DEGREE),
  );
  const most = flight.headingTurnRate * RADIANS_PER_DEGREE * STEP_S * ease;
  ship.angle = wrap(ship.angle + Math.max(-most, Math.min(most, left)), TURN);
}

/** Pushes a ship a step along its heading, slows it as it coasts, and keeps it under its top speed. */
function pushShip(ship: Ship, thrust: number, flight: Flight): void {
  const push = flight.thrust * thrust * STEP_S;
  const coast = 0.5 ** (STEP_MS / flight.coastHalfLifeMs);
  ship.vx = (ship.vx + Math.cos(ship.angle) * push) * coast;
  ship.vy = (ship.vy + Math.sin(ship.angle) * push) * coast;
  keepUnder(ship, flight.topSpeed);
}

/** Throws a ship along its heading, keeping what it flew at for when the dash ends. */
function startDash(ship: Ship): void {
  ship.keptVx = ship.vx;
  ship.keptVy = ship.vy;
  ship.vx = Math.cos(ship.angle) * DASH_SPEED;
  ship.vy = Math.sin(ship.angle) * DASH_SPEED;
  ship.dashSteps = stepsIn(DASH_MS);
  ship.rechargeSteps = stepsIn(DASH_RECHARGE_MS);
  guard(ship, DASH_GUARD_MS);
}

/**
 * Gives a ship back what it flew at before a dash, a little faster along its
 * heading as the dash ends; the step's push then keeps it under its top
 * speed.
 */
function endDash(ship: Ship): void {
  ship.vx = ship.keptVx + Math.cos(ship.angle) * DASH_CARRY;
  ship.vy = ship.keptVy + Math.sin(ship.angle) * DASH_CARRY;
}

/** Keeps a ship untouchable for at least a time from the step under way, which counts. */
function guard(ship: Ship, ms: number): void {
  ship.guardSteps = Math.max(ship.guardSteps, stepsIn(ms));
}

/** Slows a ship to a speed, if it flies faster. */
function keepUnder(ship: Ship, speed: number): void {
  const now = Math.hypot(ship.vx, ship.vy);
  if (now <= speed) return;
  ship.vx *= speed / now;
  ship.vy *= speed / now;
}
