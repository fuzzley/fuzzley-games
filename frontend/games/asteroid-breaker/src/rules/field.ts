// A wave in play: the ship, its shots, the rocks, the pickups, the strays
// and the comets, stepped in place from records made once, as Brick
// Breaker's field is.

import type { RockKindId } from "./catalog/rocks";
import type { WeaponId } from "./catalog/weapons";
import { type DropSetup, createPickups } from "./drops";
import { FieldEventLog } from "./events";
import { fillFor, stretchField } from "./fill";
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
  waitOn,
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
import { layOut, safestPlace } from "./spawn";
import { SPEED_INFO, type Speed } from "./speed";
import { stepsIn } from "./stepper";
import type { WaveStart } from "./run";
import { type Torus, across, distanceSquared, middleOf } from "./torus";
import {
  NEW_SHIP_MS,
  PICKUP_PULL_REACH,
  SHIELD_GUARD_MS,
  SHIP_HIT_RADIUS,
  STRETCH_GUARD_MS,
} from "./tuning";
import type { Wave } from "./waves";

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

/**
 * Says how a wave's field is set up beyond what the wave says: what the
 * run hands it ({@link waveStart}), its shape, the run's speed, and what the
 * player holds as it starts.
 */
export interface WaveSetup extends WaveStart {
  readonly torus: Torus;
  readonly speed: Speed;
  /** What the player holds as the wave starts, which is no move until it changes. */
  readonly held: Readonly<Steer>;
  /** How the ship flies: `tuning.ts`'s unless the debug menu tunes it. */
  readonly flight?: Flight;
  /** How its shots fly and fire: `tuning.ts`'s unless the debug menu tunes it. */
  readonly gunnery?: Gunnery;
  /**
   * How fast its rocks fly against their size's speed, which its layout
   * keeps clear of the ship at: 1 unless the debug menu tunes it.
   */
  readonly rockSpeed?: number;
}

/**
 * Says how a wave's field is set up beyond what its wave, its run and its
 * size say: what the player holds, and the numbers the debug menu tunes.
 */
export type PlayerSetup = Omit<WaveSetup, keyof WaveStart | "torus" | "speed">;

/** Describes a wave in play, which each step changes in place. */
export interface Field extends RockField {
  readonly setup: FieldSetup;
  /** The field's size, its setup's until a pause stretches it to another shape. */
  torus: Torus;
  /** The ship in play, or null once it is lost, until the next comes. */
  ship: Ship | null;
  /** The step the next ship in line comes at, or null while none is coming. */
  shipDueAt: number | null;
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
  rockSpeed: number;
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
 * Returns a wave's field laid out whole on a field of a shape, at a speed,
 * holding still for the player's first move.
 *
 * Its counts and its cap grow with the field's area, as `fillFor()` says,
 * and the speed sets its rocks' pace, its chance of a pickup, at most 1,
 * and how often its comets come. It flies as the setup's flight, gunnery
 * and rocks' speed say, its rocks laid out fairly for theirs.
 */
export function fieldFor(wave: Wave, setup: WaveSetup): Field {
  const { torus, seed, crew, banked, nextShipAt } = setup;
  const fill = fillFor(wave, torus);
  const { motion, drops, cometRate } = SPEED_INFO[setup.speed];
  const every = fill.cometEvery;
  const field = createField(
    {
      torus,
      seed,
      crew,
      banked,
      nextShipAt,
      cap: fill.cap,
      pace: wave.pace * motion,
      waveKind: wave.waveKind,
      drops: Math.min(1, wave.drops * drops),
      pool: wave.pool,
      pickupsAtOnce: fill.pickupsAtOnce,
      strays: fill.strays,
      cometEvery: every && {
        least: every.least / cometRate,
        most: every.most / cometRate,
      },
    },
    setup.held,
  );
  field.flight = setup.flight ?? TUNED_FLIGHT;
  field.gunnery = setup.gunnery ?? TUNED_GUNNERY;
  field.rockSpeed = setup.rockSpeed ?? 1;
  layOut(field, fill.rocks, wave.formation, middleOf(torus));
  return field;
}

/**
 * Returns a wave's field, its rocks' slots free, its ship waiting in its
 * middle for the player's first move, given what the player holds as it
 * comes, and its first comet's time drawn; `fieldFor()` lays its rocks.
 */
export function createField(
  setup: FieldSetup,
  held: Readonly<Steer> = STILL,
): Field {
  const { torus } = setup;
  const middle = middleOf(torus);
  const field: Field = {
    setup,
    torus,
    rocks: createRocks(setup.cap),
    waveKind: setup.waveKind,
    ship: createShip(middle.x, middle.y, held),
    shipDueAt: null,
    shots: createShots(),
    weapon: "gun",
    flight: TUNED_FLIGHT,
    gunnery: TUNED_GUNNERY,
    steer: { ...held },
    pace: setup.pace,
    rockSpeed: 1,
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
  field.steer.autoFire = steer.autoFire;
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
 * everything else stands still where it is. A wave holds still from its
 * start until the player's first move, and a ship lost is followed a
 * second later by the next in line, waiting where it is safest.
 *
 * The shots land before the comets fly, so a rock both meet in a step is
 * the shot's, for its points; the ships the step's points bring come
 * before the ship is tested, as well as after, so one they bring is the
 * run's before a rock can take the last; and the next ship comes as its
 * step starts, so a drawn rock is pulled toward it from that step.
 */
export function stepField(field: Field): void {
  if (field.cleared || holdStill(field)) return;
  field.steps += 1;
  if (field.shipDueAt !== null && field.steps >= field.shipDueAt) {
    bringShip(field);
  }
  setOffBlasts(field);
  stepEffects(field);
  const { ship, steer, torus } = field;
  if (ship && flyShip(ship, steer, torus, field.flight)) {
    field.events.addDash(ship.x, ship.y, ship.angle);
  }
  const fired = stepShots(
    field.shots,
    ship,
    steer.fire || steer.autoFire,
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
 * Stretches a paused field to a new shape, as `stretchField()` does, its
 * ship untouchable for a second from the step that follows, as the
 * stretch may bring a rock nearer it; a field of that shape already is
 * left as it is.
 */
export function reshapeField(field: Field, torus: Torus): void {
  const { width, height } = field.torus;
  if (torus.width === width && torus.height === height) return;
  stretchField(field, torus);
  if (field.ship) guardShip(field.ship, STRETCH_GUARD_MS);
}

/**
 * Holds a wave still through a step, from its start until the frame's
 * steering moves its waiting ship afresh, the ship taking the steering as
 * held, and returns whether it did.
 */
function holdStill(field: Field): boolean {
  const { ship } = field;
  return field.steps === 0 && ship !== null && waitOn(ship, field.steer);
}

/**
 * Brings the next ship in line to wait where it is safest, given what the
 * player holds as it comes, so a key held since the last was lost is no
 * move.
 */
function bringShip(field: Field): void {
  const { x, y } = safestPlace(field);
  field.ship = createShip(x, y, field.steer);
  field.shipDueAt = null;
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
 * bailing out, logged with the ships left, and the next in line taking the
 * controls, due to come a second later, and with it the chain, every
 * effect and the pickups floating.
 */
function loseShip(field: Field, ship: Readonly<Ship>): void {
  const pilot = atControls(field.crew);
  field.crew = bailOut(field.crew);
  field.events.addPilot("lost", ship.x, ship.y, pilot, field.crew);
  field.ship = null;
  field.shipDueAt =
    field.crew.flying.length > 0 ? field.steps + stepsIn(NEW_SHIP_MS) : null;
  field.shipsLost += 1;
  endChain(field);
  endEffects(field);
  clearPickups(field);
}

/**
 * Clears the wave, for its clearing's points, ending its effects, letting
 * its pickups, its stray and its comets go and bringing no next ship, and
 * sets where everything else moving was a step ago to where it is, so a
 * cleared field is drawn standing still.
 */
function clear(field: Field): void {
  field.cleared = true;
  field.shipDueAt = null;
  scoreClearing(field);
  endEffects(field);
  clearPickups(field);
  clearHazards(field);
  const { ship } = field;
  const middle = middleOf(field.torus);
  field.events.add("cleared", middle.x, middle.y);
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
