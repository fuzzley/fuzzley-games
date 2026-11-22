import { count, formatPoints } from "@fz/core/format";
import {
  isCount,
  isFiniteNumber,
  isRecord,
  isWhole,
  unknownKey,
} from "@fz/core/json";
import { isKeyOf, isOneOf, recordOf } from "@fz/core/records";
import {
  EFFECT_KINDS,
  type Effects,
  FALLING_POOL,
  type Falling,
  type InEffect,
} from "../bricks/capsules";
import { BALL_KINDS } from "../catalog/balls";
import {
  type CapsuleId,
  type EffectKind,
  type PaddleMode,
  capsule,
  isCapsuleId,
} from "../catalog/capsules";
import type { Field, FieldState } from "../field/field";
import { type Ball, OWN_INK } from "../paddle/balls";
import { BOLT_POOL, type Bolt } from "../paddle/bolts";
import type { Paddle } from "../paddle/paddle";
import { isCustomPercent } from "../speed";
import { FIELD_HEIGHT, FRIEND_INKS, MAX_BALLS, TALLEST_FIELD } from "../tuning";
import type { LevelEntry } from "../levels/levels";
import { type Run, startLevel } from "./run";
import { type SavableField, type SavedGame, saveGame } from "./saved_game";

/**
 * The parts of a field its moment leaves out: what the saved game keeps of
 * it, what its run keeps (its points and lives), what its level lays out
 * or counts again from its bricks, what happened, for the scene, and the
 * aim, which lives only while a press does.
 */
type LeftOut =
  | keyof SavableField
  | "level"
  | "setup"
  | "solid"
  | "hardSolid"
  | "needed"
  | "keysLeft"
  | "score"
  | "livesGained"
  | "livesLost"
  | "events"
  | "aim";

/**
 * Holds a field's moment, for a bug report: every live part of it the saved
 * game leaves out, as the balls, the paddle, the falling capsules, the
 * effects and the bolts stand, laid back on the field its saved game takes
 * up so it plays on as it would have.
 *
 * A part the field gains joins it, and fails to compile where it is taken
 * and read, unless it is left out on purpose. Laid, a new part is copied
 * over as it is, so one that is a record, or a pool of them, needs laying
 * into the field's own by hand, as the balls are.
 */
export type FieldMoment = Readonly<Pick<Field, Exclude<keyof Field, LeftOut>>>;

/** Every part of a moment, so a reader names one it doesn't know. */
const MOMENT_PARTS: Readonly<Record<keyof FieldMoment, true>> = {
  state: true,
  height: true,
  balls: true,
  paddle: true,
  pay: true,
  streak: true,
  climbRate: true,
  paceScale: true,
  ballSpeedScale: true,
  customPercent: true,
  ballKind: true,
  mode: true,
  net: true,
  seeking: true,
  falling: true,
  effects: true,
  bolts: true,
  boltsReadyAt: true,
  friendsFreed: true,
};

/**
 * The states a field is reported in: a moment is taken only while its
 * level is under way, and the run takes a clearing in the frame it comes.
 */
const MOMENT_STATES: readonly FieldState[] = ["serve", "playing", "lost"];

const PADDLE_MODES: Readonly<Record<PaddleMode, true>> = {
  catch: true,
  laser: true,
};

/** Every group of effects, so a reader refuses one it doesn't know. */
const EFFECT_GROUPS: Readonly<Record<EffectKind, true>> = recordOf(
  EFFECT_KINDS,
  () => true,
);

/** Checks a part of a record read from JSON, as a part of its type. */
type Check<T> = (value: unknown) => value is T;

/**
 * A check for each part of a record of a type, so a part the type gains
 * fails to compile until it has one.
 */
type Checks<T> = { readonly [K in keyof T]-?: Check<T[K]> };

const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";

const isPositive = (value: unknown): value is number =>
  isFiniteNumber(value) && value > 0;

/** Returns the check of a number no less than the least given. */
const isAtLeast =
  (least: number) =>
  (value: unknown): value is number =>
    isFiniteNumber(value) && value >= least;

const isHeight = (value: unknown): value is number =>
  isFiniteNumber(value) && value >= FIELD_HEIGHT && value <= TALLEST_FIELD;

const BALL_CHECKS: Checks<Ball> = {
  live: isBoolean,
  x: isFiniteNumber,
  y: isFiniteNumber,
  lastX: isFiniteNumber,
  lastY: isFiniteNumber,
  dx: isFiniteNumber,
  dy: isFiniteNumber,
  held: isBoolean,
  offset: isFiniteNumber,
  letGoAt: isCount,
  bounces: isCount,
  ink: (ink): ink is number =>
    isWhole(ink) && ink >= OWN_INK && ink < FRIEND_INKS,
  seeks: isBoolean,
  portalled: isBoolean,
  jumpedAt: isCount,
};

const PADDLE_CHECKS: Checks<Paddle> = {
  x: isFiniteNumber,
  lastX: isFiniteNumber,
  top: isFiniteNumber,
  width: isPositive,
  goalWidth: isPositive,
  target: (target): target is number | null =>
    target === null || isFiniteNumber(target),
  dragging: isBoolean,
  push: (push) => isOneOf(push, [-1, 0, 1] as const),
  speed: isFiniteNumber,
  facing: (facing) => isOneOf(facing, [-1, 1] as const),
};

const FALLING_CHECKS: Checks<Falling> = {
  live: isBoolean,
  id: isCapsuleId,
  x: isFiniteNumber,
  y: isFiniteNumber,
  lastY: isFiniteNumber,
};

const BOLT_CHECKS: Checks<Bolt> = {
  live: isBoolean,
  x: isFiniteNumber,
  y: isFiniteNumber,
  lastY: isFiniteNumber,
};

/** Returns the checks of an effect of a group: none in play, or a capsule of the group's. */
function effectChecks(kind: EffectKind): Checks<InEffect> {
  return {
    capsule: (id): id is CapsuleId | null =>
      id === null || (isCapsuleId(id) && capsule(id).effect.kind === kind),
    endsAt: isCount,
  };
}

/**
 * Returns a field's moment as it stands, a copy that play doesn't change,
 * without the aim. Take it only while the level is under way: a cleared
 * field's moment is one {@link readMoment} refuses.
 */
export function takeMoment(field: Readonly<Field>): FieldMoment {
  return {
    state: field.state,
    height: field.height,
    balls: field.balls.map((ball) => ({ ...ball })),
    paddle: { ...field.paddle },
    pay: field.pay,
    streak: field.streak,
    climbRate: field.climbRate,
    paceScale: field.paceScale,
    ballSpeedScale: field.ballSpeedScale,
    customPercent: field.customPercent,
    ballKind: field.ballKind,
    mode: field.mode,
    net: field.net,
    seeking: field.seeking,
    falling: field.falling.map((falling) => ({ ...falling })),
    effects: recordOf(EFFECT_KINDS, (kind) => ({ ...field.effects[kind] })),
    bolts: field.bolts.map((bolt) => ({ ...bolt })),
    boltsReadyAt: field.boltsReadyAt,
    friendsFreed: field.friendsFreed,
  };
}

/**
 * Lays a moment on a field of its level, such as the one its saved game
 * takes up, each record copied into the field's own, with no aim held.
 */
export function layMoment(field: Field, moment: FieldMoment): void {
  const { balls, paddle, falling, effects, bolts, ...parts } = moment;
  Object.assign(field, parts);
  Object.assign(field.paddle, paddle);
  layRecords(field.balls, balls);
  layRecords(field.falling, falling);
  layRecords(field.bolts, bolts);
  for (const kind of EFFECT_KINDS) {
    Object.assign(field.effects[kind], effects[kind]);
  }
  field.aim = null;
}

/**
 * Returns the error a reported state throws for a part this build can't
 * trust, naming the part, such as `moment.balls`.
 */
export function untrustedPart(part: string): Error {
  return new Error(`The game state's ${part} doesn't fit this build.`);
}

/**
 * Returns a moment from a bug report, as read from JSON.
 *
 * @throws Error naming the first part this build can't trust: one it
 *   doesn't know, a number out of its range, an id its catalog lacks, a
 *   pool of records not the field's size, an effect of another group's
 *   capsule, or a field cleared, which no report's moment is.
 */
export function readMoment(value: unknown): FieldMoment {
  if (!isRecord(value)) throw untrustedPart("moment");
  const unknown = unknownKey(value, MOMENT_PARTS);
  if (unknown !== null) throw untrustedPart(`moment.${unknown}`);
  return {
    state: checked(value, "state", (state) => isOneOf(state, MOMENT_STATES)),
    height: checked(value, "height", isHeight),
    balls: readRecords(value["balls"], MAX_BALLS, BALL_CHECKS, "moment.balls"),
    paddle: readRecord(value["paddle"], PADDLE_CHECKS, "moment.paddle"),
    pay: checked(value, "pay", isAtLeast(1)),
    streak: checked(value, "streak", isCount),
    climbRate: checked(value, "climbRate", isAtLeast(0)),
    paceScale: checked(value, "paceScale", isPositive),
    ballSpeedScale: checked(value, "ballSpeedScale", isPositive),
    customPercent: checked(value, "customPercent", isCustomPercent),
    ballKind: checked(value, "ballKind", (kind) => isKeyOf(kind, BALL_KINDS)),
    mode: checked(
      value,
      "mode",
      (mode) => mode === null || isKeyOf(mode, PADDLE_MODES),
    ),
    net: checked(value, "net", isBoolean),
    seeking: checked(value, "seeking", isBoolean),
    falling: readRecords(
      value["falling"],
      FALLING_POOL,
      FALLING_CHECKS,
      "moment.falling",
    ),
    effects: readEffects(value["effects"]),
    bolts: readRecords(value["bolts"], BOLT_POOL, BOLT_CHECKS, "moment.bolts"),
    boltsReadyAt: checked(value, "boltsReadyAt", isCount),
    friendsFreed: checked(value, "friendsFreed", isCount),
  };
}

/**
 * Returns a part of a moment read from JSON, once it passes its check.
 *
 * @throws Error naming the part where it doesn't.
 */
function checked<K extends keyof FieldMoment>(
  moment: Readonly<Record<string, unknown>>,
  part: K,
  check: (value: unknown) => value is FieldMoment[K],
): FieldMoment[K] {
  const value = moment[part];
  if (!check(value)) throw untrustedPart(`moment.${part}`);
  return value;
}

/**
 * Returns a record read from JSON as the type its checks are for.
 *
 * @throws Error naming the part where it isn't a record, lacks a part of
 *   the type's or has one besides, or a part fails its check.
 */
function readRecord<T>(value: unknown, checks: Checks<T>, part: string): T {
  const each: Readonly<Record<string, Check<unknown>>> = checks;
  const parts = Object.entries(each);
  if (
    !isRecord(value) ||
    Object.keys(value).length !== parts.length ||
    !parts.every(([name, check]) => check(value[name]))
  ) {
    throw untrustedPart(part);
  }
  // It holds each of the type's parts, each checked as that part, and no
  // other.
  return value as T;
}

/**
 * Returns a pool of records read from JSON, a record for each of the
 * field's.
 *
 * @throws Error naming the pool where it isn't a list of that many, or a
 *   record doesn't read.
 */
function readRecords<T>(
  value: unknown,
  size: number,
  checks: Checks<T>,
  part: string,
): T[] {
  if (!Array.isArray(value) || value.length !== size) {
    throw untrustedPart(part);
  }
  const records: readonly unknown[] = value;
  return records.map((record) => readRecord(record, checks, part));
}

/**
 * Returns the effects in play read from JSON, one for each group.
 *
 * @throws Error naming them where a group is missing or one is besides, or
 *   an effect doesn't read.
 */
function readEffects(value: unknown): Effects {
  if (!isRecord(value) || unknownKey(value, EFFECT_GROUPS) !== null) {
    throw untrustedPart("moment.effects");
  }
  return recordOf(EFFECT_KINDS, (kind) =>
    readRecord(value[kind], effectChecks(kind), "moment.effects"),
  );
}

/** Copies each record of a moment's pool into the field's record in its place. */
function layRecords<T extends object>(
  records: readonly T[],
  from: readonly T[],
): void {
  for (const [index, record] of records.entries()) {
    Object.assign(record, from[index]);
  }
}

/** Describes the level in play as a bug report takes it, at once. */
export interface ReportedPlay {
  /** Sums it up in a line for people: "Level 9 · Score 950 · 2 lives · 1 ball in play". */
  readonly summary: string;
  /**
   * The run and its level's field as the saved game keeps them: a run
   * waiting for its first serve as one begun, a run whose level was just
   * cleared at the start of the next, or null for a run that has ended.
   */
  readonly game: SavedGame | null;
  /** The field's moment, where the saved game keeps the field: else null. */
  readonly moment: FieldMoment | null;
}

/** Returns the level in play as a bug report takes it. */
export function reportPlay(
  run: Run,
  field: Readonly<Field>,
  levels: readonly LevelEntry[],
): ReportedPlay {
  const kept = run.outcome === "ready" ? startLevel(run) : run;
  const game = saveGame(kept, field, levels);
  return {
    summary: `Level ${String(run.level)} · Score ${formatPoints(run.score)} · ${count(run.lives, "life", "lives")} · ${standing(run, field)}`,
    game,
    moment: game?.field ? takeMoment(field) : null,
  };
}

/** Returns where a run and its field stand, as a report's summary ends. */
function standing(run: Run, field: Readonly<Field>): string {
  switch (run.outcome) {
    case "ready":
      return "not started";
    case "cleared":
      return "level cleared";
    case "over":
      return "game over";
    case "won":
      return "every level cleared";
    case "playing":
    case "paused":
      break;
  }
  switch (field.state) {
    case "serve":
      return "ball on the paddle";
    case "lost":
      return "ball lost";
    case "playing":
    case "cleared": {
      const live = field.balls.filter((ball) => ball.live).length;
      return `${count(live, "ball", "balls")} in play`;
    }
  }
}
