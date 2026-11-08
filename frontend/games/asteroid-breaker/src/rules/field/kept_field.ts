// The wave in play's field as storage keeps it: the size it was laid out
// at and its size now, its rocks, and the counts it runs by, read back only
// where each check of it holds, and laid out afresh as it was.

import { isCount, isRecord, isWhole } from "@fz/core/json";
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
import { FIELD_LONGEST_SIDE, FIELD_SHORT_SIDE, STRAY_POINTS } from "../tuning";
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
 * at and its size now, its rocks, and the counts its draws, strays, comets
 * and points run by.
 *
 * A stray adrift, the comets on their way, the pickups, the shots, the
 * effects in play and the chain go.
 */
export interface SavedField {
  /**
   * The size it was laid out at, which set its slots, its strays, the
   * pickups it floats at once and its comets' times.
   */
  readonly laidOut: Torus;
  /** Its size now, which a pause may have stretched it to since. */
  readonly torus: Torus;
  /** Each rock whole, and each broken and waiting to go off, for its blast. */
  readonly rocks: readonly SavedRock[];
  readonly steps: number;
  readonly draws: number;
  /** How many strays the wave has sent. */
  readonly straysSent: number;
  /** The step the next stray comes at. */
  readonly nextStrayAt: number;
  /** The step the next comet's warning starts at. */
  readonly nextCometAt: number;
  /** The step a pickup was last let go at, from which a drought is counted. */
  readonly lastDropAt: number;
  /** What the chain's multiplier has added to the wave's points, for its tally. */
  readonly chainPoints: number;
  /** How many ships the wave has lost, which a clean wave has none of. */
  readonly shipsLost: number;
}

/** The counts a field storage keeps runs by. */
const KEPT_COUNTS = [
  "steps",
  "draws",
  "straysSent",
  "nextStrayAt",
  "nextCometAt",
  "lastDropAt",
  "chainPoints",
  "shipsLost",
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
  | "lastDropAt"
  | "chainPoints"
  | "shipsLost"
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
    nextStrayAt: strays.adrift.live
      ? nextStrayAfter(field.steps)
      : strays.nextAt,
    nextCometAt: field.comets.nextAt,
    lastDropAt: field.lastDropAt,
    chainPoints: field.chainPoints,
    shipsLost: field.shipsLost,
  };
}

/**
 * Returns a wave's field as storage kept it, or null if it can't be
 * trusted: a count that isn't one, a size no board lays a field out at, a
 * rock that can't be trusted, a pickup let go after its last step, or a
 * field that hasn't moved, doesn't fit its wave or doesn't agree with what
 * its run has scored on it.
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
  if (!laidOut || !torus || !hasKeptCounts(value)) return null;
  const rocks = readRocks(kept, torus, value.steps);
  if (!rocks) return null;
  const field = { laidOut, torus, rocks, ...pick(value, KEPT_COUNTS) };
  const sound =
    hasMoved(field) &&
    hasDroppedInTime(field) &&
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

/**
 * Returns whether a field kept fits its wave, laid out at the size it was:
 * a rock left, and no more than the wave holds, and no more strays sent
 * than it sends.
 */
export function fitsItsWave(
  field: Pick<SavedField, "laidOut" | "rocks" | "straysSent">,
  wave: Wave,
): boolean {
  const fill = fillFor(wave, field.laidOut);
  const { length } = field.rocks;
  return length > 0 && length <= fill.cap && field.straysSent <= fill.strays;
}

/**
 * Returns whether a field kept agrees with what its run has scored on its
 * wave: no more strays brought home than it has sent, and no fewer points
 * than the chain and those strays have scored.
 */
export function fitsItsRun(
  { straysSent, chainPoints }: Pick<SavedField, "straysSent" | "chainPoints">,
  { points, straysHome }: WaveSoFar,
): boolean {
  return (
    straysHome <= straysSent &&
    chainPoints + straysHome * STRAY_POINTS <= points
  );
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
 * draws, strays, comets and points run by, its points and strays brought
 * home as its run has scored them on it, and its ship waiting where it is
 * safest, as the next in line would.
 */
export function layOutKeptField(
  wave: Wave,
  setup: Omit<WaveSetup, "torus">,
  saved: SavedField,
  { points, straysHome }: WaveSoFar,
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
  field.strays.nextAt = saved.nextStrayAt;
  field.strays.broughtHome = straysHome;
  field.comets.nextAt = saved.nextCometAt;
  field.lastDropAt = saved.lastDropAt;
  field.score = points;
  field.chainPoints = saved.chainPoints;
  field.shipsLost = saved.shipsLost;
  bringShip(field);
  return field;
}

/** Returns a copy of a field's size. */
function sizeOf({ width, height }: Torus): Torus {
  return { width, height };
}

/**
 * Returns a field's rocks as storage kept them, on a field of a size after
 * its last step, or null if they aren't a list or a rock can't be trusted.
 */
function readRocks(
  value: unknown,
  torus: Torus,
  steps: number,
): SavedRock[] | null {
  if (!Array.isArray(value)) return null;
  const rocks: SavedRock[] = [];
  for (const rock of value) {
    const read = readRock(rock, torus, steps);
    if (!read) return null;
    rocks.push(read);
  }
  return rocks;
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
 * Returns whether a value is a number JSON can hold: neither infinite nor
 * not a number.
 */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Returns whether a value is a place along an axis of a length, from 0 to
 * under it.
 */
function isWithin(value: unknown, length: number): value is number {
  return isFiniteNumber(value) && value >= 0 && value < length;
}
