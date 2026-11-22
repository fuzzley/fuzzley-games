// The wave in play's field as it stands at a step, beyond what storage keeps
// of it (`kept_field.ts`): the ship as it flew, its line in tow, the crew,
// each rock's slot, the shots, the pickups, the sparks, the stray adrift, the
// crew knocked loose, the comets, the burrs and the effects in play. A bug
// report carries it, so that the field its saved game takes up, with this
// laid on, plays on as the player's did, step for step.

import {
  isCount,
  isFiniteNumber,
  isListOf,
  isRecord,
  isWhole,
  listOf,
} from "@fz/core/json";
import { isKeyOf, keysOf, pick, recordOf } from "@fz/core/records";
import { type PickupId, isPickupId, pickup } from "../catalog/pickups";
import { WEAPONS, type WeaponId } from "../catalog/weapons";
import type { Burr } from "../hazards/burrs";
import { COMET_PASSES, COMET_RECORDS, type Comet } from "../hazards/comets";
import type { Crossing } from "../hazards/crossing";
import { type Loose, createLoose } from "../hazards/loose";
import type { Stray } from "../hazards/strays";
import { type Floating, PICKUP_RECORDS } from "../rocks/drops";
import { EFFECT_KINDS, type Effects, type InEffect } from "../rocks/pickups";
import { type Rock, isFree } from "../rocks/rocks";
import { type Crew, PILOT_COLORS, type Pilot } from "../ship/pilots";
import type { Held, Ship } from "../ship/ship";
import { type Shot, createShots } from "../ship/shots";
import type { TowLink } from "../ship/tow";
import type { NearPass } from "../sparks/grazes";
import type { Spark } from "../sparks/sparks";
import type { Torus } from "../torus";
import { MOST_CREW, MOST_SPARKS } from "../tuning";
import type { Wave } from "../waves/waves";
import type { Field } from "./field";
import { fillFor } from "./fill";
import type { SavedField } from "./kept_field";

/**
 * The records of a kind the field makes once, each in its slot, null for
 * one free, up to the last in play, the rest free too.
 */
export type Slots<T> = readonly (T | null)[];

/**
 * What of a rock storage doesn't keep: the slot it fills, the step it was
 * laid at, which a blast and a shot flown on through rocks go by, and how
 * its pass by the pod stands.
 */
export type RockMoment = Pick<Rock, "slot" | "laidAt" | "pass">;

/**
 * The wave in play's field at a step, beyond what storage keeps of it: what
 * moves on it, each in the slot it fills, the crew as the field holds them,
 * the crew knocked loose among none of them, and the effects in play with
 * what they change.
 */
export interface FieldMoment {
  /** The ship as it flew: its place, speed and heading, its dash, its guard, the burrs clinging and what it last held. */
  readonly ship: Ship;
  /** Each link riding in tow, the first nearest the ship. */
  readonly tow: readonly TowLink[];
  readonly crew: Crew;
  /** What storage doesn't keep of each rock, in the order it keeps them. */
  readonly rocks: readonly RockMoment[];
  /** The shots in flight. */
  readonly shots: Slots<Shot>;
  /** The steps until the weapon in hand can fire again. */
  readonly reloadSteps: number;
  readonly weapon: WeaponId;
  readonly effects: Effects;
  readonly shielded: boolean;
  readonly pullReach: number;
  /** How fast the rocks go against their own speed, which Slow changes. */
  readonly pace: number;
  /** The pickups floating. */
  readonly pickups: Slots<Floating>;
  /** The sparks out. */
  readonly sparks: Slots<Spark>;
  /** The stray adrift, or null for none. */
  readonly stray: Stray | null;
  /** The step the next stray comes at, which storage counts from a stray adrift as gone. */
  readonly nextStrayAt: number;
  /** The crew knocked loose, out on the field. */
  readonly loose: Slots<Loose>;
  /** The comets on their way, warned of or crossing. */
  readonly comets: Slots<Comet>;
  /** The burrs adrift. */
  readonly burrs: Slots<Burr>;
}

/** What a moment is read against: the field storage kept, as its saved game holds it. */
export type KeptShape = Pick<
  SavedField,
  "laidOut" | "torus" | "rocks" | "steps"
>;

/**
 * Checks a value read from JSON as one of a record's keys, on a field of a
 * size, as a value of that key's type.
 */
type Check<T> = (value: unknown, torus: Torus) => value is T;

/** The check of each of a record's keys. */
type Checks<T> = { readonly [K in keyof T]-?: Check<T[K]> };

/** The shots' slots as the field makes them, which say how many it has, and each one's passes. */
const SHOTS_MADE = createShots().slots;

/** How many shots can fly at once, which the shots' slots hold. */
const SHOT_SLOTS = SHOTS_MADE.length;

/** How many rocks a shot can fly on through, which its record keeps the steps of. */
const SHOT_PASSES = Math.max(...SHOTS_MADE.map((shot) => shot.passedAt.length));

/** How many of the crew can be out knocked loose at once, which their slots hold. */
const LOOSE_SLOTS = createLoose().length;

/** Each way a pass by the pod stands, so a value read is one of them. */
const NEAR_PASSES: Readonly<Record<NearPass, true>> = {
  clear: true,
  near: true,
  spent: true,
};

/**
 * Returns the field's moment: copies of what moves on it and of the
 * effects, made at once, as the field changes them in place, and its crew,
 * which it replaces whole; or null for a field with no ship, whose run is
 * over.
 */
export function momentOf(field: Field): FieldMoment | null {
  const { ship } = field;
  if (!ship) return null;
  return {
    ship: copyShip(ship),
    tow: field.tow.slice(0, field.crew.tow.length).map((link) => ({ ...link })),
    crew: field.crew,
    rocks: field.rocks
      .filter((rock) => !isFree(rock))
      .map(({ slot, laidAt, pass }) => ({ slot, laidAt, pass })),
    shots: inPlay(field.shots.slots, isFlying, copyShot),
    reloadSteps: field.shots.reloadSteps,
    weapon: field.weapon,
    effects: recordOf(EFFECT_KINDS, (kind) => ({ ...field.effects[kind] })),
    shielded: field.shielded,
    pullReach: field.pullReach,
    pace: field.pace,
    pickups: inPlay(field.pickups, isLive, copyRecord),
    sparks: inPlay(field.sparks, isLive, copyRecord),
    stray: field.strays.adrift.live ? { ...field.strays.adrift } : null,
    nextStrayAt: field.strays.nextAt,
    loose: inPlay(field.loose, isLive, copyRecord),
    comets: inPlay(field.comets.slots, isLive, copyComet),
    burrs: inPlay(field.burrs.slots, isLive, copyRecord),
  };
}

/**
 * Lays a moment on the field its saved game takes up
 * (`layOutKeptField()`), whose rocks lie in its first slots as storage keeps
 * them: each is moved to its own slot, and everything the moment holds put
 * in its slot, a copy of it, each other slot of its kind freed.
 */
export function layMoment(field: Field, moment: FieldMoment): void {
  field.ship = copyShip(moment.ship);
  field.crew = moment.crew;
  for (const [link, laid] of field.tow.entries()) {
    const kept = moment.tow[link];
    if (kept) Object.assign(laid, kept);
  }
  layRocks(field.rocks, moment.rocks);
  laySlots(field.shots.slots, moment.shots, copyShot, (shot) => {
    shot.lifeSteps = 0;
  });
  field.shots.reloadSteps = moment.reloadSteps;
  field.weapon = moment.weapon;
  for (const kind of EFFECT_KINDS) {
    Object.assign(field.effects[kind], moment.effects[kind]);
  }
  field.shielded = moment.shielded;
  field.pullReach = moment.pullReach;
  field.pace = moment.pace;
  laySlots(field.pickups, moment.pickups, copyRecord, free);
  laySlots(field.sparks, moment.sparks, copyRecord, free);
  laySlots([field.strays.adrift], [moment.stray], copyRecord, free);
  field.strays.nextAt = moment.nextStrayAt;
  laySlots(field.loose, moment.loose, copyRecord, free);
  laySlots(field.comets.slots, moment.comets, copyComet, free);
  laySlots(field.burrs.slots, moment.burrs, copyRecord, free);
}

/**
 * Returns a field's moment as a report carried it, read against the field
 * storage kept and its wave.
 *
 * @throws Error naming the first part that can't be trusted: one of a kind
 *   there isn't, a number out of its range, a place off the field, more of
 *   a kind than the field has slots for, an effect of another group's
 *   pickup, or not a rock for each storage kept.
 */
export function readMoment(
  value: unknown,
  wave: Wave,
  kept: KeptShape,
): FieldMoment {
  if (!isRecord(value)) throw unreadable("moment");
  const { torus } = kept;
  const fill = fillFor(wave, kept.laidOut);
  const crew = trusted("crew", readCrew(value["crew"]));
  const slots = <T extends object>(
    part: keyof FieldMoment,
    most: number,
    checks: Checks<T>,
  ): Slots<T> => trusted(part, readSlots(value[part], most, checks, torus));
  const stray = value["stray"];
  return {
    ship: trusted("ship", readShip(value["ship"], torus)),
    tow: trusted("tow", readTow(value["tow"], crew.tow.length)),
    crew,
    rocks: trusted("rocks", readRocks(value["rocks"], kept, fill.cap)),
    shots: slots("shots", SHOT_SLOTS, SHOT_CHECKS),
    reloadSteps: trusted("reloadSteps", countOrNull(value["reloadSteps"])),
    weapon: trusted("weapon", weaponOrNull(value["weapon"])),
    effects: trusted("effects", readEffects(value["effects"])),
    shielded: trusted("shielded", booleanOrNull(value["shielded"])),
    pullReach: trusted("pullReach", positiveOrNull(value["pullReach"])),
    pace: trusted("pace", positiveOrNull(value["pace"])),
    pickups: slots("pickups", PICKUP_RECORDS, FLOATING_CHECKS),
    sparks: slots("sparks", MOST_SPARKS, SPARK_CHECKS),
    stray:
      stray === null ? null : trusted("stray", readOf(stray, STRAY_CHECKS)),
    nextStrayAt: trusted("nextStrayAt", countOrNull(value["nextStrayAt"])),
    loose: slots("loose", LOOSE_SLOTS, LOOSE_CHECKS),
    comets: slots("comets", COMET_RECORDS, COMET_CHECKS),
    burrs: slots("burrs", fill.burrsAtOnce, BURR_CHECKS),
  };
}

/** Returns a copy of a ship, and of what it last held. */
function copyShip(ship: Ship): Ship {
  return { ...ship, held: { ...ship.held } };
}

/** Returns a copy of a shot, and of the steps it flew on through rocks at. */
function copyShot(shot: Shot): Shot {
  return { ...shot, passedAt: [...shot.passedAt] };
}

/** Returns a copy of a comet, and of the steps it broke rocks in. */
function copyComet(comet: Comet): Comet {
  return { ...comet, smashedAt: [...comet.smashedAt] };
}

/** Returns a copy of a record that holds no list. */
function copyRecord<T extends object>(record: T): T {
  return { ...record };
}

/** Returns whether a record is on the field. */
function isLive(record: { readonly live: boolean }): boolean {
  return record.live;
}

/** Returns whether a shot is in flight. */
function isFlying(shot: Readonly<Shot>): boolean {
  return shot.lifeSteps > 0;
}

/** Takes a record off the field, freeing its slot. */
function free(record: { live: boolean }): void {
  record.live = false;
}

/**
 * Returns a copy of each record of a kind in play, in its slot, null for
 * each free, up to the last in play.
 */
function inPlay<T>(
  records: readonly T[],
  isIn: (record: T) => boolean,
  copy: (record: T) => T,
): Slots<T> {
  const slots = records.map((record) => (isIn(record) ? copy(record) : null));
  while (slots.length > 0 && slots[slots.length - 1] === null) slots.pop();
  return slots;
}

/**
 * Lays each record a moment holds of a kind in its slot, a copy of it, and
 * frees every other slot of the kind.
 */
function laySlots<T extends object>(
  records: readonly T[],
  kept: Slots<T>,
  copy: (record: T) => T,
  freeSlot: (record: T) => void,
): void {
  for (const [slot, record] of records.entries()) {
    const laid = kept[slot];
    if (laid) {
      Object.assign(record, copy(laid));
    } else {
      freeSlot(record);
    }
  }
}

/**
 * Moves each rock storage kept, from the first slots it is laid in, to its
 * own, with the step it was laid at and its pass, and frees every other
 * slot.
 */
function layRocks(rocks: readonly Rock[], kept: readonly RockMoment[]): void {
  const laid = rocks
    .filter((rock) => !isFree(rock))
    .map((rock) => ({ ...rock }));
  const bySlot = new Map(
    kept.map((moment, at) => [moment.slot, { ...laid[at], ...moment }]),
  );
  for (const rock of rocks) {
    const moved = bySlot.get(rock.slot);
    if (moved) {
      Object.assign(rock, moved);
    } else {
      rock.live = false;
      rock.goesOffAt = 0;
    }
  }
}

/** Returns an error naming the part of a moment that can't be trusted. */
function unreadable(part: string): Error {
  return new Error(`The field's ${part} can't be read.`);
}

/** Returns a part of a moment that was read, or throws for one that wasn't. */
function trusted<T>(part: string, value: T | null): T {
  if (value === null) throw unreadable(part);
  return value;
}

/** Returns whether a value read is a record whose every key passes its check. */
function isOf<T>(
  value: unknown,
  checks: Checks<T>,
  torus: Torus = NO_TORUS,
): value is T {
  return (
    isRecord(value) &&
    keysOf<keyof T & string>(checks).every((key) =>
      checks[key](value[key], torus),
    )
  );
}

/**
 * Returns a record read, of its own keys only, or null where a key fails
 * its check.
 */
function readOf<T extends object>(
  value: unknown,
  checks: Checks<T>,
  torus: Torus = NO_TORUS,
): T | null {
  if (!isOf(value, checks, torus)) return null;
  // The checks name every key of the record, so the keys picked are all of
  // its own, which a generic Pick can't be shown to be.
  return pick(value, keysOf<keyof T & string>(checks)) as T;
}

/**
 * Returns the records of a kind read, each in its slot or null for a free
 * one, no more than the field has slots for, or null where one fails.
 */
function readSlots<T extends object>(
  value: unknown,
  most: number,
  checks: Checks<T>,
  torus: Torus,
): Slots<T> | null {
  if (!Array.isArray(value) || value.length > most) return null;
  const read = listOf(value, (item): T | false | null =>
    item === null ? false : readOf(item, checks, torus),
  );
  return read?.map((record) => record || null) ?? null;
}

/** Returns the ship read, and what it last held, or null where it fails. */
function readShip(value: unknown, torus: Torus): Ship | null {
  const ship = readOf(value, SHIP_CHECKS, torus);
  const held = ship && readOf(ship.held, HELD_CHECKS);
  return ship && held ? { ...ship, held } : null;
}

/** Returns the links riding in tow read, one for each in tow, or null where one fails. */
function readTow(value: unknown, inTow: number): TowLink[] | null {
  const links = listOf(value, (link) => readOf(link, TOW_CHECKS));
  return links?.length === inTow ? links : null;
}

/**
 * Returns the crew read, a pilot at the controls and no more in tow than
 * ride, or null where it fails.
 */
function readCrew(value: unknown): Crew | null {
  if (!isRecord(value)) return null;
  const { pilot, tow, home, lastGiven } = value;
  const sound =
    isPilot(pilot) &&
    isListOf(tow, isPilot) &&
    tow.length < MOST_CREW &&
    isListOf(home, isPilot) &&
    isPilot(lastGiven);
  return sound ? { pilot, tow, home, lastGiven } : null;
}

/**
 * Returns what a moment holds of each rock storage kept, one for each, in
 * slots rising under the field's cap, each laid by the step the field was
 * kept at, or null where one fails.
 */
function readRocks(
  value: unknown,
  kept: KeptShape,
  cap: number,
): RockMoment[] | null {
  const rocks = listOf(value, (rock) => readOf(rock, ROCK_CHECKS));
  const sound =
    rocks?.length === kept.rocks.length &&
    rocks.every(
      ({ slot, laidAt }, at) =>
        slot < cap &&
        laidAt <= kept.steps &&
        slot > (rocks[at - 1]?.slot ?? -1),
    );
  return sound ? rocks : null;
}

/** Returns the effects in play read, one of each group, or null where one fails. */
function readEffects(value: unknown): Effects | null {
  return isEffects(value)
    ? recordOf(EFFECT_KINDS, (kind) => pick(value[kind], keysOf(EFFECT_CHECKS)))
    : null;
}

/**
 * Returns whether a value read holds an effect of each group, each of a
 * pickup of its group, or of none.
 */
function isEffects(value: unknown): value is Effects {
  return (
    isRecord(value) &&
    EFFECT_KINDS.every((kind) => {
      const effect = value[kind];
      return (
        isOf(effect, EFFECT_CHECKS) &&
        (effect.pickup === null || pickup(effect.pickup).effect.kind === kind)
      );
    })
  );
}

/** Returns a value read if it is a count, else null. */
function countOrNull(value: unknown): number | null {
  return isCount(value) ? value : null;
}

/** Returns a value read if it is a number above nothing, else null. */
function positiveOrNull(value: unknown): number | null {
  return isFiniteNumber(value) && value > 0 ? value : null;
}

/** Returns a value read if it is a yes or a no, else null. */
function booleanOrNull(value: unknown): boolean | null {
  return isBoolean(value) ? value : null;
}

/** Returns a value read if it names a weapon, else null. */
function weaponOrNull(value: unknown): WeaponId | null {
  return isWeapon(value) ? value : null;
}

/** Returns whether a value names a weapon. */
function isWeapon(value: unknown): value is WeaponId {
  return isKeyOf(value, WEAPONS);
}

/** Returns whether a value names a pilot, by its color's number. */
function isPilot(value: unknown): value is Pilot {
  return isWhole(value) && value >= 0 && value < PILOT_COLORS;
}

/** Returns whether a value is a yes or a no. */
function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/** Returns whether a value is true, as a record in play is live. */
function isTrue(value: unknown): value is boolean {
  return value === true;
}

/** Returns whether a value is a heading in radians, or null for none. */
function isHeading(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

/** Returns whether a value names how a pass by the pod stands. */
function isNearPass(value: unknown): value is NearPass {
  return isKeyOf(value, NEAR_PASSES);
}

/** Returns whether a value names the pickup an effect in play came from, or none. */
function isEffectPickup(value: unknown): value is PickupId | null {
  return value === null || isPickupId(value);
}

/** Returns whether a value is a place across the field, from 0 to under its width. */
function isAcross(value: unknown, torus: Torus): value is number {
  return isFiniteNumber(value) && value >= 0 && value < torus.width;
}

/** Returns whether a value is a place down the field, from 0 to under its height. */
function isDown(value: unknown, torus: Torus): value is number {
  return isFiniteNumber(value) && value >= 0 && value < torus.height;
}

/** Returns whether a value is a count above nothing, as a shot in flight has steps left. */
function isPositiveCount(value: unknown): value is number {
  return isCount(value) && value > 0;
}

/** Returns the check of a list of steps, one for each of so many, or −1 for none. */
function stepsOf(length: number): Check<number[]> {
  return (value): value is number[] =>
    isListOf(value, isStepOrNone) && value.length === length;
}

/** Returns whether a value is a field's step, or −1 for none. */
function isStepOrNone(value: unknown): value is number {
  return isWhole(value) && value >= -1;
}

/** Stands in for a field's size where a record's places aren't held to it. */
const NO_TORUS: Torus = { width: Infinity, height: Infinity };

/** The checks of what the ship last held. */
const HELD_CHECKS: Checks<Held> = {
  turn: isFiniteNumber,
  heading: isHeading,
  aiming: isBoolean,
  aimX: isFiniteNumber,
  aimY: isFiniteNumber,
  thrust: isFiniteNumber,
  fire: isBoolean,
  dash: isBoolean,
};

/** The checks of the ship, on the field. */
const SHIP_CHECKS: Checks<Ship> = {
  x: isAcross,
  y: isDown,
  vx: isFiniteNumber,
  vy: isFiniteNumber,
  angle: isFiniteNumber,
  lastX: isAcross,
  lastY: isDown,
  lastAngle: isFiniteNumber,
  turnRamp: isFiniteNumber,
  dashSteps: isCount,
  keptVx: isFiniteNumber,
  keptVy: isFiniteNumber,
  rechargeSteps: isCount,
  guardSteps: isCount,
  waiting: isBoolean,
  burrs: isCount,
  held: (value): value is Held => isOf(value, HELD_CHECKS),
  cameHeading: isFiniteNumber,
};

/** The checks of a link in tow. */
const TOW_CHECKS: Checks<TowLink> = {
  x: isFiniteNumber,
  y: isFiniteNumber,
  lastX: isFiniteNumber,
  lastY: isFiniteNumber,
};

/** The checks of a shot in flight, on the field. */
const SHOT_CHECKS: Checks<Shot> = {
  x: isAcross,
  y: isDown,
  vx: isFiniteNumber,
  vy: isFiniteNumber,
  lastX: isAcross,
  lastY: isDown,
  lifeSteps: isPositiveCount,
  weapon: isWeapon,
  breaksLeft: isCount,
  passedAt: stepsOf(SHOT_PASSES),
};

/** The checks of a pickup floating, on the field. */
const FLOATING_CHECKS: Checks<Floating> = {
  live: isTrue,
  id: isPickupId,
  x: isAcross,
  y: isDown,
  vx: isFiniteNumber,
  vy: isFiniteNumber,
  lastX: isAcross,
  lastY: isDown,
  lifeSteps: isCount,
};

/** The checks of a spark out, on the field. */
const SPARK_CHECKS: Checks<Spark> = {
  live: isTrue,
  x: isAcross,
  y: isDown,
  lastX: isAcross,
  lastY: isDown,
  wayX: isFiniteNumber,
  wayY: isFiniteNumber,
  shedAt: isCount,
};

/** The checks of one of the crew knocked loose, on the field. */
const LOOSE_CHECKS: Checks<Loose> = {
  live: isTrue,
  pilot: isPilot,
  x: isAcross,
  y: isDown,
  lastX: isAcross,
  lastY: isDown,
  wayX: isFiniteNumber,
  wayY: isFiniteNumber,
  speed: isFiniteNumber,
  knockedAt: isCount,
};

/** The checks of what storage doesn't keep of a rock. */
const ROCK_CHECKS: Checks<RockMoment> = {
  slot: isCount,
  laidAt: isCount,
  pass: isNearPass,
};

/** The checks of an effect in play, or none of its group. */
const EFFECT_CHECKS: Checks<InEffect> = {
  pickup: isEffectPickup,
  endsAt: isCount,
};

/** The checks of what crosses the field from off an edge, which may lie off it. */
const CROSSING_CHECKS: Checks<Crossing> = {
  live: isTrue,
  x: isFiniteNumber,
  y: isFiniteNumber,
  heading: isFiniteNumber,
  lastX: isFiniteNumber,
  lastY: isFiniteNumber,
};

/** The checks of the stray adrift, which may lie off the field as it comes in. */
const STRAY_CHECKS: Checks<Stray> = {
  ...CROSSING_CHECKS,
  pilot: isPilot,
  turn: isFiniteNumber,
};

/** The checks of a comet on its way, which may lie off the field as it comes in. */
const COMET_CHECKS: Checks<Comet> = {
  ...CROSSING_CHECKS,
  warnSteps: isCount,
  smashedAt: stepsOf(COMET_PASSES),
  smashes: isCount,
  pass: isNearPass,
};

/** The checks of a burr adrift, which may lie off the field as it comes in. */
const BURR_CHECKS: Checks<Burr> = {
  ...CROSSING_CHECKS,
  wraps: isBoolean,
};
