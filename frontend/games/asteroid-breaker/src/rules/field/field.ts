// A wave in play: the ship, its line in tow, its shots, the rocks, the
// pickups, the strays, the crew knocked loose and the comets, stepped in
// place from records made once, as Brick Breaker's field is.

import type { RockKindId } from "../catalog/rocks";
import type { WeaponId } from "../catalog/weapons";
import { type DropSetup, createPickups } from "../rocks/drops";
import { FieldEventLog } from "./events";
import { fillFor, stretchField } from "./fill";
import {
  type CometSetup,
  type Comets,
  clearComets,
  createComets,
  scheduleFirstComet,
  stepComets,
  touchingComet,
} from "../hazards/comets";
import {
  type Loose,
  createLoose,
  floatAllHome,
  knockLastLoose,
  stepLoose,
  takeAllBack,
} from "../hazards/loose";
import {
  type StraySetup,
  type Strays,
  clearStrays,
  createStrays,
  stepStrays,
} from "../hazards/strays";
import {
  type Effects,
  clearPickups,
  createEffects,
  endEffect,
  endEffects,
  stepEffects,
  stepPickups,
} from "../rocks/pickups";
import { type Crew, atControls, bailOut } from "../ship/pilots";
import {
  TUNED_TOWING,
  type TowLink,
  type Towing,
  createTow,
  layTow,
  settleTow,
  stepTow,
} from "../ship/tow";
import { scoreClearing } from "./scoring";
import {
  type Rock,
  type RockField,
  createRocks,
  hitRock,
  rockHitRadius,
  rocksLeft,
  setOffBlasts,
  stepRocks,
} from "../rocks/rocks";
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
} from "../ship/ship";
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
} from "../ship/shots";
import {
  type Charge,
  type Sparking,
  TUNED_SPARKING,
  createCharge,
  drainStatic,
  knockStaticDown,
} from "../sparks/charge";
import { countGrazes, spendPasses } from "../sparks/grazes";
import { clearSparks, createSparks, stepSparks } from "../sparks/sparks";
import { zap } from "../sparks/zap";
import { layOut, safestPlace } from "./spawn";
import { SPEED_INFO, type Speed } from "../speed";
import {
  type Place,
  type Torus,
  across,
  distanceSquared,
  middleOf,
} from "../torus";
import {
  HIT_GUARD_MS,
  PICKUP_PULL_REACH,
  SHIELD_GUARD_MS,
  SHIP_HIT_RADIUS,
  STRETCH_GUARD_MS,
} from "../tuning";
import type { Wave } from "../waves/waves";

/**
 * Says how a wave is played: its field's size and cap, the seed its draws
 * come from, its pace, the kind of rock it names, the pickups it lets go,
 * what it sends across the field, and the crew and the static it starts
 * with.
 */
export interface FieldSetup extends DropSetup, StraySetup, CometSetup {
  readonly torus: Torus;
  /** The most rocks the field holds at once. */
  readonly cap: number;
  /** How many whole rocks, or fewer, are its wave's last few. */
  readonly lastFew: number;
  readonly seed: number;
  /** How fast its rocks go against their own speed: the wave's pace and the speed's together. */
  readonly pace: number;
  /** The kind of rock it names, which a boulder breaks into. */
  readonly waveKind: RockKindId;
  /** The run's crew as the wave starts. */
  readonly crew: Crew;
  /** The pilot's static as the wave starts, which the run carries from wave to wave. */
  readonly charge: number;
  /**
   * How far the ship draws sparks in from, against the field's sparking, by
   * the speed: 1 but at Relaxed, which draws them from farther.
   */
  readonly sparkReach: number;
}

/** Describes what the field of a run's wave takes from the run as it starts. */
export type WaveStart = Pick<FieldSetup, "seed" | "crew" | "charge">;

/**
 * Says how a wave's field is set up beyond what the wave says: what the
 * run hands it (`run.ts`'s `waveStart()`), its shape, the run's speed, and
 * what the player holds as it starts.
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
  /** How the crew ride in tow: `tuning.ts`'s unless given. */
  readonly towing?: Towing;
  /**
   * How sparks, static and the zap work: `tuning.ts`'s unless the debug
   * menu tunes it.
   */
  readonly sparking?: Sparking;
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
  /** The ship in play, the one a run flies, or null once a hit with no one in tow ends the run. */
  ship: Ship | null;
  /**
   * A link for each of the most that ride in tow, the first nearest the
   * ship, of which the first as many as the crew has in tow ride, in its
   * order.
   */
  readonly tow: readonly TowLink[];
  /** How the crew ride in tow, as its setup gave it. */
  towing: Towing;
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
   * Who is at the controls, in tow and gone home, which the wave changes as
   * hits knock the crew loose and the ship catches them and strays, for the
   * run to take.
   */
  crew: Crew;
  /** How many hits the ship has taken, but those the Shield took. */
  hits: number;
  /** The pilot's static, which multiplies what is scored and goes on to the next wave. */
  readonly charge: Charge;
  /** How sparks, static and the zap work, which the debug menu tunes in play. */
  sparking: Sparking;
  readonly strays: Strays;
  /** A slot for each of the crew that can be knocked loose at once, out on the field or not. */
  readonly loose: readonly Loose[];
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
 * and how often its comets come. It flies as the setup's flight, gunnery,
 * towing, sparking and rocks' speed say, its rocks laid out fairly for
 * theirs.
 */
export function fieldFor(wave: Wave, setup: WaveSetup): Field {
  const { torus, seed, crew, charge } = setup;
  const fill = fillFor(wave, torus);
  const { motion, drops, cometRate, sparkReach } = SPEED_INFO[setup.speed];
  const every = fill.cometEvery;
  const field = createField(
    {
      torus,
      seed,
      crew,
      charge,
      cap: fill.cap,
      lastFew: fill.lastFew,
      pace: wave.pace * motion,
      sparkReach,
      waveKind: wave.waveKind,
      drops: Math.min(1, wave.drops * drops),
      pool: wave.pool,
      pickupsAtOnce: fill.pickupsAtOnce,
      strays: fill.strays,
      strayFirstMs: fill.strayFirstMs,
      cometEvery: every && {
        least: every.least / cometRate,
        most: every.most / cometRate,
      },
    },
    setup.held,
  );
  field.flight = setup.flight ?? TUNED_FLIGHT;
  field.gunnery = setup.gunnery ?? TUNED_GUNNERY;
  field.towing = setup.towing ?? TUNED_TOWING;
  field.sparking = setup.sparking ?? TUNED_SPARKING;
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
    lastFew: setup.lastFew,
    hadMore: false,
    ship: createShip(middle.x, middle.y, held),
    tow: createTow(),
    towing: TUNED_TOWING,
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
    sparks: createSparks(),
    effects: createEffects(),
    shielded: false,
    pullReach: PICKUP_PULL_REACH,
    crew: setup.crew,
    hits: 0,
    charge: createCharge(setup.charge),
    sparking: TUNED_SPARKING,
    score: 0,
    staticPoints: 0,
    rockPoints: 0,
    sparkPoints: 0,
    strayPoints: 0,
    strays: createStrays(setup.strayFirstMs),
    loose: createLoose(),
    comets: createComets(),
    cleared: false,
    events: new FieldEventLog(),
  };
  layTow(field);
  scheduleFirstComet(field);
  return field;
}

/** Takes a frame's steering, which the steps until the next frame follow. */
export function steerField(field: Field, steer: Readonly<Steer>): void {
  Object.assign(field.steer, steer);
}

/**
 * Moves the field on by a step: blasts due go off, effects whose time is
 * up end and static drains, the ship flies by the frame's steering, a dash
 * begun at full static zapping, its line in tow following it, and fires,
 * its shots and the rocks fly, each shot meets the first rock in its way,
 * the comets fly, breaking what they meet, a rock or a comet hits a ship it
 * touches that isn't guarded, or spends its shield, one that passed near
 * untouched is a near miss, and the pickups, the sparks, the stray and the
 * crew knocked loose float on, the ship catching those it touches and
 * gathering the sparks it reaches. Once no rock is left, the wave is
 * cleared: its effects end, its pickups, sparks, stray and comets go, the
 * crew knocked loose come back, and everything else stands still where it
 * is. A wave holds still from its start until the player's first move.
 *
 * The shots land before the comets fly, so a rock both meet in a step is
 * the shot's, for its points.
 */
export function stepField(field: Field): void {
  if (field.cleared || holdStill(field)) return;
  field.steps += 1;
  setOffBlasts(field);
  stepEffects(field);
  drainStatic(field);
  const { ship, steer, torus } = field;
  if (ship && flyShip(ship, steer, torus, field.flight)) {
    field.events.addDash(ship.x, ship.y, ship.angle);
    zap(field, ship, ship.angle);
  }
  stepTow(field);
  const fired = stepShots(field, steer.fire || steer.autoFire);
  if (ship && fired) field.events.addFired(ship.x, ship.y, field.weapon);
  stepRocks(field);
  for (const shot of field.shots.slots) {
    if (shot.lifeSteps === 0) continue;
    const rock = firstMet(field, shot);
    if (rock) {
      landShot(shot, hitRock(field, rock, shot.vx, shot.vy), field.steps);
    }
  }
  stepComets(field);
  if (ship) meetDangers(field, ship);
  countGrazes(field);
  stepPickups(field);
  stepSparks(field);
  stepStrays(field);
  stepLoose(field);
  if (rocksLeft(field) === 0) clear(field);
}

/**
 * Stretches a paused field to a new shape, as `stretchField()` does, its
 * ship untouchable for a second from the step that follows, as the
 * stretch may bring a rock nearer it, and no pass under way a near miss;
 * a field of that shape already is left as it is.
 */
export function reshapeField(field: Field, torus: Torus): void {
  const { width, height } = field.torus;
  if (torus.width === width && torus.height === height) return;
  stretchField(field, torus);
  spendPasses(field);
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
 * Brings the ship to wait where it is safest, as a run taken up does, given
 * what the player holds as it comes, so a key held is no move, with the
 * line in tow straight out behind it.
 */
export function bringShip(field: Field): void {
  const { x, y } = safestPlace(field);
  field.ship = createShip(x, y, field.steer);
  layTow(field);
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
 * guarded hit it, or, while it is shielded, spend the shield on it, before
 * anyone in tow: a rock breaks a size down, and a comet, which can't be
 * broken, flies on. The ship is kept untouchable a while after, so a rock's
 * pieces can fly clear, and a hit knocks static down a step, the rock it
 * breaks scored first.
 */
function meetDangers(field: Field, ship: Ship): void {
  if (isGuarded(ship)) return;
  const rock = touchingRock(field, ship);
  const danger = rock ?? touchingComet(field, ship);
  if (danger === null) return;
  const { shielded } = field;
  if (shielded) {
    endEffect(field, "guard");
    guardShip(ship, SHIELD_GUARD_MS);
    field.events.add("shielded", ship.x, ship.y);
  } else if (field.crew.tow.length > 0) {
    knockOneLoose(field, ship, danger);
  } else {
    endRun(field, ship);
    return;
  }
  if (rock) breakOnShip(field, ship, rock);
  if (!shielded) knockStaticDown(field);
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
 * Takes a hit with someone in tow: the last in tow is knocked loose, logged
 * at the ship with the way the blow came, and the ship is kept untouchable
 * a while; the effects in play and the pickups floating stay.
 */
function knockOneLoose(
  field: Field,
  ship: Ship,
  danger: Readonly<Place>,
): void {
  const pilot = knockLastLoose(field, ship);
  const { torus } = field;
  field.hits += 1;
  field.events.addKnocked(
    ship.x,
    ship.y,
    pilot,
    field.crew,
    across(danger.x, ship.x, torus.width),
    across(danger.y, ship.y, torus.height),
  );
  guardShip(ship, HIT_GUARD_MS);
}

/** Breaks a rock that hit the ship a size down, its pieces pushed away from the ship. */
function breakOnShip(field: Field, ship: Readonly<Ship>, rock: Rock): void {
  const { torus } = field;
  hitRock(
    field,
    rock,
    across(ship.x, rock.x, torus.width),
    across(ship.y, rock.y, torus.height),
    "breaks",
  );
}

/**
 * Ends the run with a hit with no one in tow: the ship bursts, which its
 * shots in flight outlive, its pilot bailing out home, logged, the crew
 * knocked loose floating home, and with it every effect and the pickups
 * floating.
 */
function endRun(field: Field, ship: Readonly<Ship>): void {
  const pilot = atControls(field.crew);
  field.crew = bailOut(field.crew);
  field.hits += 1;
  field.events.addPilot("lost", ship.x, ship.y, pilot, field.crew);
  field.ship = null;
  floatAllHome(field);
  endEffects(field);
  clearPickups(field);
}

/**
 * Clears the wave, for its clearing's points, ending its effects, letting
 * its pickups, its sparks, its stray and its comets go, taking the crew
 * knocked loose back, and sets where everything else moving was a step ago
 * to where it is, so a cleared field is drawn standing still.
 */
function clear(field: Field): void {
  field.cleared = true;
  scoreClearing(field);
  endEffects(field);
  clearPickups(field);
  clearSparks(field);
  clearStrays(field);
  clearComets(field);
  takeAllBack(field);
  const { ship } = field;
  const middle = middleOf(field.torus);
  field.events.add("cleared", middle.x, middle.y);
  if (ship) {
    ship.lastX = ship.x;
    ship.lastY = ship.y;
    ship.lastAngle = ship.angle;
  }
  settleTow(field);
  for (const shot of field.shots.slots) {
    shot.lastX = shot.x;
    shot.lastY = shot.y;
  }
}
