// The wave in play's field as storage keeps it: the size it was laid out
// at and its size now, its rocks, the counts it runs by and the pilot's
// static, read back only where each check of it holds, and laid out afresh
// as it was.

import {
  isCount,
  isFiniteNumber,
  isRecord,
  isWhole,
  listOf,
} from "@fz/core/json";
import { pick } from "@fz/core/records";
import {
  type RockKindId,
  type RockTrait,
  isRockKindId,
  isRockSize,
  rockKind,
} from "../catalog/rocks";
import { nextStrayAfter } from "../hazards/strays";
import { ROCK_OUTLINES, type Rock, isFree } from "../rocks/rocks";
import { stepsIn } from "../stepper";
import type { Torus } from "../torus";
import {
  FIELD_LONGEST_SIDE,
  FIELD_SHORT_SIDE,
  STATIC_MOST,
  STRAY_HOME_POINTS,
  STRAY_POINTS,
} from "../tuning";
import type { Wave } from "../waves/waves";
import { type Field, type WaveSetup, bringShip, fieldFor } from "./field";
import { fillFor, stretchField } from "./fill";

/**
 * What of a rock storage keeps: what it is, where it is, how it flies and
 * turns, how it is drawn, the hits it has left, and whether it is whole or
 * broken and waiting to go off, and when.
 */
const KEPT_OF_ROCK = [
  "kind",
  "size",
  "x",
  "y",
  "vx",
  "vy",
  "angle",
  "spin",
  "outline",
  "hits",
  "live",
  "goesOffAt",
] as const satisfies readonly (keyof Rock)[];

/** A rock as storage keeps it: whole, or broken and waiting to go off. */
export type SavedRock = Readonly<Pick<Rock, (typeof KEPT_OF_ROCK)[number]>>;

/** Names a key of a rock storage keeps. */
type KeptRockKey = keyof SavedRock;

/**
 * Checks what storage kept under one of a rock's keys, on a field of a
 * size, as a value of that key's type.
 */
type Check<T> = (value: unknown, torus: Torus) => value is T;

/**
 * The check of each key of a rock storage keeps, alone: of a kind and a
 * size there are, on the field, numbers JSON can hold, an outline it has,
 * its hits and its blast's step counts, and whole or broken.
 */
const ROCK_CHECKS: { readonly [K in KeptRockKey]: Check<SavedRock[K]> } = {
  kind: isRockKindId,
  size: isRockSize,
  x: (x, torus): x is number => isWithin(x, torus.width),
  y: (y, torus): y is number => isWithin(y, torus.height),
  vx: isFiniteNumber,
  vy: isFiniteNumber,
  angle: isFiniteNumber,
  spin: isFiniteNumber,
  outline: isOutline,
  hits: isCount,
  live: (live): live is boolean => typeof live === "boolean",
  goesOffAt: isCount,
};

/**
 * The wave in play's field as storage keeps it: the size it was laid out
 * at and its size now, its rocks, the counts its draws, strays, comets,
 * burrs and points run by, the pilot's static, whether its wave has thrown
 * its pilot a lifeline and whether it has held more rocks than its last
 * few.
 *
 * A stray adrift, the crew knocked loose, whom the run keeps as gone home,
 * the comets on their way, the burrs adrift and clinging, the pickups, the
 * sparks, the shots and the effects in play go.
 */
export interface SavedField {
  /**
   * The size it was laid out at, which set its slots, its strays, its
   * burrs, the pickups it floats at once and its comets' times.
   */
  readonly laidOut: Torus;
  /** Its size now, which a pause may have stretched it to since. */
  readonly torus: Torus;
  /** Each rock whole, and each broken and waiting to go off, for its blast. */
  readonly rocks: readonly SavedRock[];
  readonly steps: number;
  readonly draws: number;
  /** How many strays the wave has sent, as its setup says, its lifeline not among them. */
  readonly straysSent: number;
  /** Whether the wave has thrown its pilot a lifeline, a stray sent at once to a pilot with no one in tow. */
  readonly lifelineSent: boolean;
  /** The step the next stray comes at. */
  readonly nextStrayAt: number;
  /** The step the next comet's warning starts at. */
  readonly nextCometAt: number;
  /** How many burrs the wave has sent, as its setup says. */
  readonly burrsSent: number;
  /** The step the next burr may come at. */
  readonly nextBurrAt: number;
  /** The step a pickup was last let go at, from which a drought is counted. */
  readonly lastDropAt: number;
  /** What static's multiplier has added to the wave's points, for its tally. */
  readonly staticPoints: number;
  /** The rocks' own points among the wave's, the burrs popped among them, for its tally. */
  readonly rockPoints: number;
  /** The sparks' own points among the wave's, for its tally. */
  readonly sparkPoints: number;
  /** The strays' own points among the wave's, for its tally. */
  readonly strayPoints: number;
  /** How many hits the ship has taken, which a clean wave has none of. */
  readonly hits: number;
  /** The step static holds from before it drains: the last spark's, or a hit's that knocked it down. */
  readonly lastSparkAt: number;
  /** The pilot's static. */
  readonly charge: number;
  /**
   * Whether its wave has held more whole rocks than its last few, which
   * lean toward the ship once no more are whole.
   */
  readonly hadMore: boolean;
}

/** The counts a field storage keeps runs by. */
const KEPT_COUNTS = [
  "steps",
  "draws",
  "straysSent",
  "nextStrayAt",
  "nextCometAt",
  "burrsSent",
  "nextBurrAt",
  "lastDropAt",
  "staticPoints",
  "rockPoints",
  "sparkPoints",
  "strayPoints",
  "hits",
  "lastSparkAt",
] as const satisfies readonly (keyof SavedField)[];

/** Names a count a field storage keeps runs by. */
type KeptCount = (typeof KEPT_COUNTS)[number];

/** What of a field storage keeps. */
export type SavableField = Pick<
  Field,
  | "setup"
  | "torus"
  | "rocks"
  | "steps"
  | "draws"
  | "strays"
  | "comets"
  | "burrs"
  | "lastDropAt"
  | "staticPoints"
  | "rockPoints"
  | "sparkPoints"
  | "strayPoints"
  | "hits"
  | "charge"
  | "hadMore"
>;

/**
 * What a field kept must agree with of its run: the wave's points and the
 * strays it has brought home.
 */
export interface WaveSoFar {
  readonly points: number;
  readonly straysHome: number;
}

/**
 * Returns what storage keeps of a field, a stray adrift counted as gone, so
 * the next comes as long after this step as it would after one gone.
 */
export function savedField(field: SavableField): SavedField {
  const { strays } = field;
  return {
    laidOut: sizeOf(field.setup.torus),
    torus: sizeOf(field.torus),
    rocks: field.rocks
      .filter((rock) => !isFree(rock))
      .map((rock) => pick(rock, KEPT_OF_ROCK)),
    steps: field.steps,
    draws: field.draws,
    straysSent: strays.sent,
    lifelineSent: strays.lifelineSent,
    nextStrayAt: strays.adrift.live
      ? nextStrayAfter(strays, field.steps)
      : strays.nextAt,
    nextCometAt: field.comets.nextAt,
    burrsSent: field.burrs.sent,
    nextBurrAt: field.burrs.nextAt,
    lastDropAt: field.lastDropAt,
    staticPoints: field.staticPoints,
    rockPoints: field.rockPoints,
    sparkPoints: field.sparkPoints,
    strayPoints: field.strayPoints,
    hits: field.hits,
    lastSparkAt: field.charge.lastSparkAt,
    charge: field.charge.level,
    hadMore: field.hadMore,
  };
}

/**
 * Returns a wave's field as storage kept it, or null if it can't be
 * trusted: a count that isn't one, a size no board lays a field out at, a
 * rock that can't be trusted, a pickup let go or a spark gathered after its
 * last step, static past its most, a `lifelineSent` or `hadMore` that
 * isn't true or false, or a field that hasn't moved, doesn't fit its wave
 * or doesn't agree with what its run has scored on it.
 */
export function readField(
  value: unknown,
  wave: Wave,
  soFar: WaveSoFar,
): SavedField | null {
  if (!isRecord(value)) return null;
  const laidOut = readTorus(value["laidOut"]);
  const torus = readTorus(value["torus"]);
  const kept = value["rocks"];
  const { charge, lifelineSent, hadMore } = value;
  if (
    !laidOut ||
    !torus ||
    !hasKeptCounts(value) ||
    !isStatic(charge) ||
    typeof lifelineSent !== "boolean" ||
    typeof hadMore !== "boolean"
  ) {
    return null;
  }
  const { steps } = value;
  const rocks = listOf(kept, (rock) => readRock(rock, torus, steps));
  if (!rocks) return null;
  const field: SavedField = {
    laidOut,
    torus,
    rocks,
    ...pick(value, KEPT_COUNTS),
    charge,
    lifelineSent,
    hadMore,
  };
  const sound =
    hasMoved(field) &&
    hasDroppedInTime(field) &&
    hasSparkedInTime(field) &&
    fitsItsWave(field, wave) &&
    fitsItsRun(field, soFar);
  return sound ? field : null;
}

/**
 * Returns a field's size as storage kept it, or null for one no board lays
 * a field out at.
 */
export function readTorus(value: unknown): Torus | null {
  if (!isRecord(value)) return null;
  const { width, height } = value;
  if (!isFiniteNumber(width) || !isFiniteNumber(height)) return null;
  const short = Math.min(width, height);
  const long = Math.max(width, height);
  if (short !== FIELD_SHORT_SIDE || long > FIELD_LONGEST_SIDE) return null;
  return { width, height };
}

/** Returns whether each count a field kept runs by is one. */
export function hasKeptCounts(
  value: Readonly<Record<string, unknown>>,
): value is Pick<SavedField, KeptCount> {
  return KEPT_COUNTS.every((key) => isCount(value[key]));
}

/** Returns whether a field kept has moved, as one not yet moved is kept as none. */
export function hasMoved(field: Pick<SavedField, "steps">): boolean {
  return field.steps > 0;
}

/** Returns whether a field kept let its last pickup go no later than its last step. */
export function hasDroppedInTime(
  field: Pick<SavedField, "steps" | "lastDropAt">,
): boolean {
  return field.lastDropAt <= field.steps;
}

/** Returns whether a field kept had its last spark gathered no later than its last step. */
export function hasSparkedInTime(
  field: Pick<SavedField, "steps" | "lastSparkAt">,
): boolean {
  return field.lastSparkAt <= field.steps;
}

/** Returns whether a value is the pilot's static as storage keeps it: from nothing to its most. */
export function isStatic(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= STATIC_MOST;
}

/**
 * Returns whether a field kept fits its wave, laid out at the size it was:
 * a rock left, and no more than the wave holds, and no more strays or
 * burrs sent than it sends.
 */
export function fitsItsWave(
  field: Pick<SavedField, "laidOut" | "rocks" | "straysSent" | "burrsSent">,
  wave: Wave,
): boolean {
  const fill = fillFor(wave, field.laidOut);
  const { length } = field.rocks;
  return (
    length > 0 &&
    length <= fill.cap &&
    field.straysSent <= fill.strays &&
    field.burrsSent <= fill.burrs
  );
}

/**
 * Returns whether a field kept agrees with what its run has scored on its
 * wave: no more strays brought home than it has sent, its lifeline among
 * them, the strays' own points what those strays score, each joining the
 * line or going straight home, and its points, the rocks', the sparks',
 * static's and the strays', adding up to the wave's.
 */
export function fitsItsRun(
  field: Pick<
    SavedField,
    | "straysSent"
    | "lifelineSent"
    | "staticPoints"
    | "rockPoints"
    | "sparkPoints"
    | "strayPoints"
  >,
  { points, straysHome }: WaveSoFar,
): boolean {
  const { staticPoints, rockPoints, sparkPoints, strayPoints } = field;
  const sent = field.straysSent + (field.lifelineSent ? 1 : 0);
  return (
    straysHome <= sent &&
    isStrayPoints(strayPoints, straysHome) &&
    rockPoints + sparkPoints + staticPoints + strayPoints === points
  );
}

/**
 * Returns whether a count of points is what some strays brought home score
 * of their own, each {@link STRAY_POINTS} as it joins the line in tow or
 * {@link STRAY_HOME_POINTS} as it goes straight home.
 */
export function isStrayPoints(points: number, strays: number): boolean {
  for (let home = 0; home <= strays; home++) {
    const joined = strays - home;
    if (joined * STRAY_POINTS + home * STRAY_HOME_POINTS === points) {
      return true;
    }
  }
  return false;
}

/**
 * Returns whether a value is a rock as storage keeps it, each of its keys
 * passing its own check, on a field of a size.
 */
export function isKeptRock(value: unknown, torus: Torus): value is SavedRock {
  return (
    isRecord(value) &&
    KEPT_OF_ROCK.every((key) => ROCK_CHECKS[key](value[key], torus))
  );
}

/**
 * Returns whether a rock kept comes in its size, with no more hits left
 * than its kind starts with at it.
 */
export function fitsItsKind(
  rock: Pick<SavedRock, "kind" | "size" | "hits">,
): boolean {
  const most = rockKind(rock.kind).hits[rock.size];
  return most !== undefined && rock.hits <= most;
}

/**
 * Returns whether a rock kept is in a state its kind comes to, after a
 * field's last step: whole, with hits left and no blast due, or broken,
 * with none left and its blast still to go off within its kind's beat.
 */
export function isSoundRock(
  rock: Pick<SavedRock, "kind" | "hits" | "live" | "goesOffAt">,
  steps: number,
): boolean {
  const { kind, hits, goesOffAt } = rock;
  return rock.live
    ? hits > 0 && goesOffAt === 0
    : hits === 0 && isFuseLit(kind, goesOffAt, steps);
}

/**
 * Returns the wave in play's field as storage kept it, laid out afresh as
 * `fieldFor()` lays it out but at the size it was laid out at, so its
 * slots, strays and comets are as they were, and stretched to the size it
 * was kept at: its rocks in its first slots, the rest free, the counts its
 * draws, strays, comets, burrs and points run by, the pilot's static, its points
 * and strays brought home as its run has scored them on it, and its ship
 * waiting where it is safest, its line in tow behind it.
 */
export function layOutKeptField(
  wave: Wave,
  setup: Omit<WaveSetup, "torus">,
  saved: SavedField,
  soFar: WaveSoFar,
): Field {
  const field = fieldFor(wave, { ...setup, torus: saved.laidOut });
  stretchField(field, saved.torus);
  for (const [slot, rock] of field.rocks.entries()) {
    const kept = saved.rocks[slot];
    if (!kept) {
      rock.live = false;
      continue;
    }
    Object.assign(rock, kept);
    rock.lastX = kept.x;
    rock.lastY = kept.y;
  }
  field.steps = saved.steps;
  field.draws = saved.draws;
  field.strays.sent = saved.straysSent;
  field.strays.lifelineSent = saved.lifelineSent;
  field.strays.nextAt = saved.nextStrayAt;
  field.strays.broughtHome = soFar.straysHome;
  field.comets.nextAt = saved.nextCometAt;
  field.burrs.sent = saved.burrsSent;
  field.burrs.nextAt = saved.nextBurrAt;
  field.lastDropAt = saved.lastDropAt;
  field.score = soFar.points;
  field.staticPoints = saved.staticPoints;
  field.rockPoints = saved.rockPoints;
  field.sparkPoints = saved.sparkPoints;
  field.strayPoints = saved.strayPoints;
  field.hits = saved.hits;
  field.charge.level = saved.charge;
  field.charge.lastSparkAt = saved.lastSparkAt;
  field.hadMore = saved.hadMore;
  bringShip(field);
  return field;
}

/** Returns a copy of a field's size. */
function sizeOf({ width, height }: Torus): Torus {
  return { width, height };
}

/**
 * Returns a rock as storage kept it, on a field of a size after its last
 * step, or null if it fails a check: a key's value, its kind's sizes and
 * hits, or the states its kind comes to.
 */
function readRock(
  value: unknown,
  torus: Torus,
  steps: number,
): SavedRock | null {
  if (!isKeptRock(value, torus)) return null;
  if (!fitsItsKind(value) || !isSoundRock(value, steps)) return null;
  return pick(value, KEPT_OF_ROCK);
}

/**
 * Returns whether a broken rock's blast is still to go off, after a
 * field's last step, within its kind's beat of it.
 */
function isFuseLit(
  kind: RockKindId,
  goesOffAt: number,
  steps: number,
): boolean {
  const blast = rockKind(kind).traits.find(isBlast);
  return (
    blast !== undefined &&
    goesOffAt > steps &&
    goesOffAt <= steps + stepsIn(blast.delayMs)
  );
}

/** Returns whether a trait is a blast's. */
function isBlast(
  trait: RockTrait,
): trait is Extract<RockTrait, { kind: "blasts" }> {
  return trait.kind === "blasts";
}

/**
 * Returns whether a value is one of a rock's outlines, from 0 to under
 * {@link ROCK_OUTLINES}.
 */
function isOutline(value: unknown): value is number {
  return isWhole(value) && value >= 0 && value < ROCK_OUTLINES;
}

/**
 * Returns whether a value is a place along an axis of a length, from 0 to
 * under it.
 */
function isWithin(value: unknown, length: number): value is number {
  return isFiniteNumber(value) && value >= 0 && value < length;
}
