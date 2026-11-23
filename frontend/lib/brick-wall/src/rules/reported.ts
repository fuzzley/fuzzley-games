// A wall game's state as a bug report keeps it, as JSON, and read back: the
// run, and where its round starts, as its saved game keeps them; the level's
// shots since the game began recording them, each kept as the game's codec
// keeps a shot, saying only what differs from the shot before, and played
// again through the game's round to the run and wall the report keeps; and
// the round in play, which is the game's own, as what a shot is and how a
// round plays are.

import { isFiniteNumber, isRecord, unknownKey } from "@fz/core/json";
import { isDepth } from "./field";
import type { IdentifiedLevel } from "./progress";
import { type Run, type RunRules, type TakenRound, takeRound } from "./run";
import {
  type Kept,
  type KeptTally,
  type SavedRules,
  type SavedRun,
  type TakenUp,
  hasKnownLevel,
  savedRunOf,
} from "./saved_wall";

/**
 * Describes a level's shot as a report keeps it: the shot as the game's
 * codec keeps it; then, only where one applies, the moment it was dropped
 * at, the rules it flew on where they weren't the rules' own, and the
 * field's depth where it wasn't the shot's before, each left null where a
 * later one follows.
 */
export type ReportedShot = readonly unknown[];

/** Describes a level's shots as a report keeps them: where the record of them begins, and each shot since. */
export interface ReportedRecord<G> {
  /**
   * The run as its first shot was released, and where that shot started,
   * as the saved game keeps them: the level's opening, or where a run taken
   * up stood.
   */
  readonly from: G;
  readonly shots: readonly ReportedShot[];
}

/**
 * Describes a wall game's state as a bug report keeps it, as JSON: the run,
 * as it stood before the round in play if one is, and where that round, or
 * the round aimed, starts, both as the saved game keeps them, `G`; the
 * level's shots before the round in play, since the game began recording
 * them; and the round in play, as the game keeps it, `U`.
 */
export interface ReportedGame<G, U> {
  readonly game: G;
  /** Null where the game has recorded no shot before the round in play, or the report left them out. */
  readonly record: ReportedRecord<G> | null;
  /** Null where no round is in play, or the report left it out. */
  readonly round: U | null;
}

/**
 * Describes how a reported game shrinks to fit a report's link:
 * `at(kept)` keeps `kept` of its `most` parts, the most useful first, and
 * says what it left out.
 */
export interface ReportedTrim<V> {
  readonly most: number;
  at(kept: number): { readonly value: V; readonly note: string };
}

/** Describes a round as a wall game released it, for a report to keep and play again: its shot `S`, played on the rules `R`. */
export interface ReleasedRound<T, N, S, R> {
  /** The run once the round's level started, before the round was taken in. */
  readonly started: Run<T>;
  /** Where it started, `N`. */
  readonly start: N;
  readonly shot: S;
  readonly rules: R;
  /** The moment it was dropped at, or null for one flown whole. */
  readonly dropped: number | null;
}

/** Describes a wall game as it stands, as a report takes it, its rounds released `P`. */
export interface ReportedPlay<T, N, P> {
  /** The run on the board. */
  readonly run: Run<T>;
  /** Where the round aimed, or in play, starts. */
  readonly start: N;
  /**
   * The level's rounds released since the game began recording them, as the
   * level began or a run was taken up, in order.
   */
  readonly rounds: readonly P[];
  /** Whether the last of them is in play: released, and the next not yet aimed. */
  readonly inPlay: boolean;
  /** Whether the run keeps no records. */
  readonly tuned: boolean;
}

/** Describes a level's shot read back from a report, ready to play again. */
export interface ReadShot<S, R> {
  readonly shot: S;
  readonly rules: R;
  /** The moment it was dropped at, or null for one flown whole. */
  readonly dropped: number | null;
  /** The field's depth it was played on. */
  readonly depth: number;
}

/** Describes a level's shots read back from a report: the run and start the first was played from, and each in turn. */
export interface ReadRecord<T, N, S, R> {
  readonly from: TakenUp<T, N>;
  readonly shots: readonly ReadShot<S, R>[];
}

/**
 * Describes a reported game read back: the run before the round in play, or
 * on the board, and where that round, or the round aimed, starts, paused,
 * with its level's shots and its round in play, as the game reads it, `V`.
 */
export interface ReadReport<T, N, S, R, V> {
  readonly game: TakenUp<T, N>;
  readonly record: ReadRecord<T, N, S, R> | null;
  readonly round: V | null;
}

/**
 * Holds how a wall game keeps a shot, `S`, in a report and reads one back,
 * and the rules, `R`, a round of it was played on.
 */
export interface ShotCodec<S, R> {
  /** How many of a reported shot's entries the shot itself takes, first. */
  readonly shotLength: number;
  /** Returns a shot as a report keeps it: `shotLength` entries. */
  readonly keepShot: (shot: S) => readonly unknown[];
  /** Returns a shot from the `shotLength` entries a report keeps of it, or null where they aren't one. */
  readonly readShot: (kept: readonly unknown[]) => S | null;
  /** The rules a round plays on but where a debug menu retunes them. */
  readonly ownRules: R;
  /** Returns the rules a round was played on as a report keeps them, or null for the rules' own. */
  readonly keepRules: (rules: R) => unknown;
  /** Returns the rules a round was played on, from what a report keeps of them, or null where they aren't rules a round plays on. */
  readonly readRules: (kept: unknown) => R | null;
}

/** Holds what a wall game hands a reported game's reader: how a run kept is taken up, and its round in play read. */
export interface ReportReaders<T, N, V> {
  /** Returns a run and where its round starts as the saved game kept them, taken up, or null where they can't be trusted. */
  readonly restore: (value: Kept) => TakenUp<T, N> | null;
  /**
   * Returns the round in play as a report keeps it, read back.
   *
   * @throws Error naming what doesn't fit.
   */
  readonly readRound: (value: unknown) => V;
}

/** Holds what a wall game hands a record's replay: how a round plays, and what of a run and start differs from the report's. */
export interface ReplayRules<T, N, S, R, O extends TakenRound> {
  /** Returns how a round played from a start ends, and where the next starts, its shot dropped at the moment given unless it's null. */
  readonly play: (
    start: N,
    shot: S,
    rules: R,
    dropped: number | null,
  ) => { readonly outcome: O; readonly next: N };
  /** Says what of a run and where its round starts differs from what a report keeps, the first part that does, or returns null where none does. */
  readonly differs: (
    run: Run<T>,
    start: N,
    kept: TakenUp<T, N>,
  ) => string | null;
}

/** The parts of a report's state, so a part the type gains fails to compile until the reader knows it. */
const REPORTED_PARTS: Readonly<
  Record<keyof ReportedGame<unknown, unknown>, true>
> = { game: true, record: true, round: true };

/** The parts of a report's record. */
const RECORD_PARTS: Readonly<Record<keyof ReportedRecord<unknown>, true>> = {
  from: true,
  shots: true,
};

/** The most entries a reported shot holds past the shot itself: the moment it was dropped at, its rules and its depth. */
const MOST_AFTER_SHOT = 3;

/**
 * Returns a wall game's state as a bug report keeps it, from the game as it
 * stands: the run before the round in play, if one is, the record of the
 * level's shots before it, and the round in play as `roundOf()` keeps it.
 */
export function reportOf<
  T extends KeptTally,
  K,
  N extends { readonly depth: number },
  S,
  R,
  P extends ReleasedRound<T, N, S, R>,
  U,
>(
  played: ReportedPlay<T, N, P>,
  levels: readonly IdentifiedLevel[],
  rules: Pick<SavedRules<T, K, N>, "keptStart"> &
    Pick<ShotCodec<S, R>, "keepShot" | "keepRules">,
  roundOf: (round: P) => U,
): ReportedGame<SavedRun<T, K>, U> {
  const { rounds, tuned } = played;
  const inPlay = played.inPlay ? rounds.at(-1) : undefined;
  const before = inPlay === undefined ? rounds : rounds.slice(0, -1);
  const [first] = before;
  return {
    game:
      inPlay === undefined
        ? reportedRunOf(played.run, played.start, levels, tuned, rules)
        : reportedRunOf(inPlay.started, inPlay.start, levels, tuned, rules),
    record:
      first === undefined
        ? null
        : {
            from: reportedRunOf(
              first.started,
              first.start,
              levels,
              tuned,
              rules,
            ),
            shots: shotsOf(before, first.start.depth, rules),
          },
    round: inPlay === undefined ? null : roundOf(inPlay),
  };
}

/**
 * Returns a reported game read back, its runs under the id `restore()`
 * gives them, paused, or throws naming the first part this build can't
 * trust: the level, the run, a shot or the round in play.
 *
 * @throws Error naming the part.
 */
export function readReport<T, N extends { readonly depth: number }, S, R, V>(
  value: unknown,
  levels: readonly IdentifiedLevel[],
  rules: ReportReaders<T, N, V> &
    Pick<ShotCodec<S, R>, "shotLength" | "readShot" | "ownRules" | "readRules">,
): ReadReport<T, N, S, R, V> {
  const parts = partsOf(value, REPORTED_PARTS, "The game state");
  const game = readReportedRun(parts.game, levels, rules, "The game state");
  const { record, round } = parts;
  return {
    game,
    record:
      record === null
        ? null
        : readRecord(record, levels, rules, game.run.level),
    round: round === null ? null : rules.readRound(round),
  };
}

/**
 * Returns the rounds a record's shots play, played again through the
 * game's round from where the record began, each as it was played, once
 * they come to the run and the start a report keeps. Only a brick's hits
 * change in play, so the start a report keeps is the one they come to, its
 * depth the field's since the last shot.
 *
 * @throws Error where a shot ends the level, or the shots come to another
 *   run or start than the report keeps, as a build that plays them
 *   otherwise does.
 */
export function replayRecord<
  T,
  N extends { readonly depth: number },
  S,
  R,
  O extends TakenRound,
>(
  { from, shots }: ReadRecord<T, N, S, R>,
  kept: TakenUp<T, N>,
  rules: Pick<RunRules<T, O>, "tallied"> & ReplayRules<T, N, S, R, O>,
): ReleasedRound<T, N, S, R>[] {
  let run: Run<T> = { ...from.run, outcome: "playing" };
  let { start } = from;
  const rounds: ReleasedRound<T, N, S, R>[] = [];
  for (const [
    index,
    { shot, rules: flownOn, dropped, depth },
  ] of shots.entries()) {
    const at: N = start.depth === depth ? start : { ...start, depth };
    const { outcome, next } = rules.play(at, shot, flownOn, dropped);
    if (outcome.result !== "on") {
      throw new Error(
        `Shot ${String(index + 1)} of the game state ends the level in this build.`,
      );
    }
    rounds.push({ started: run, start: at, shot, rules: flownOn, dropped });
    run = takeRound(run, outcome, rules);
    start = next;
  }
  const differs = rules.differs(run, start, kept);
  if (differs !== null) {
    throw new Error(
      `The shots in the game state play out differently in this build. ${differs}`,
    );
  }
  return rounds;
}

/**
 * Returns how a reported game shrinks to fit a report's link, where it has
 * a part to leave out: its parts, the round in play kept before the
 * level's shots.
 */
export function trimReported<G, U>(
  reported: ReportedGame<G, U>,
): ReportedTrim<ReportedGame<G, U>> | undefined {
  const parts = [
    ...(reported.round === null ? [] : (["round"] as const)),
    ...(reported.record === null ? [] : (["record"] as const)),
  ];
  if (parts.length === 0) return undefined;
  return {
    most: parts.length,
    at: (kept) => {
      const dropped = new Set(parts.slice(kept));
      const value: ReportedGame<G, U> = {
        ...reported,
        record: dropped.has("record") ? null : reported.record,
        round: dropped.has("round") ? null : reported.round,
      };
      const words = [
        ...(dropped.has("record") ? ["the level's shots"] : []),
        ...(dropped.has("round") ? ["the shot in the air"] : []),
      ];
      return { value, note: `without ${words.join(" or ")}` };
    },
  };
}

/**
 * Returns a value's parts, or throws where it isn't a record, holds a part
 * the reader doesn't know, or lacks one, naming the value as `name`.
 *
 * @throws Error naming what is wrong.
 */
export function partsOf<Known extends string>(
  value: unknown,
  known: Readonly<Record<Known, true>>,
  name: string,
): Readonly<Record<Known, unknown>> {
  if (!isRecord(value)) throw new Error(`${name} isn't one this build reads.`);
  const unknown = unknownKey(value, known);
  if (unknown !== null) {
    throw new Error(`${name} has a part this build doesn't know: ${unknown}.`);
  }
  for (const key of Object.keys(known)) {
    if (!(key in value)) throw new Error(`${name} lacks a part: ${key}.`);
  }
  // Every part the reader knows is there, and no other.
  return value as Readonly<Record<Known, unknown>>;
}

/** Returns a shot as a report keeps it read back, or null where it isn't a list of the entries the game keeps a shot as. */
export function readKeptShot<S>(
  value: unknown,
  {
    shotLength,
    readShot,
  }: Pick<ShotCodec<S, unknown>, "shotLength" | "readShot">,
): S | null {
  if (!Array.isArray(value) || value.length !== shotLength) return null;
  const kept: readonly unknown[] = value;
  return readShot(kept);
}

/** Returns whether a value is a moment of a flight: a number from 0. */
export function isMoment(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

/** Returns a run and where its round starts as the saved game keeps them, the start left out for a level with no round played. */
function reportedRunOf<T extends KeptTally, K, N>(
  run: Run<T>,
  start: N,
  levels: readonly IdentifiedLevel[],
  tuned: boolean,
  { keptStart }: Pick<SavedRules<T, K, N>, "keptStart">,
): SavedRun<T, K> {
  const kept = run.rounds === 0 ? null : keptStart(start);
  return savedRunOf(run, kept, levels, tuned);
}

/** Returns a level's rounds as a report keeps their shots, each saying only what differs from the round's before, the first from the depth given. */
function shotsOf<N extends { readonly depth: number }, S, R>(
  rounds: readonly ReleasedRound<unknown, N, S, R>[],
  firstDepth: number,
  { keepShot, keepRules }: Pick<ShotCodec<S, R>, "keepShot" | "keepRules">,
): ReportedShot[] {
  let depth = firstDepth;
  return rounds.map(({ shot, start, rules, dropped }) => {
    const moved = start.depth === depth ? null : start.depth;
    depth = start.depth;
    const kept = keepShot(shot);
    const retuned = keepRules(rules);
    if (moved !== null) return [...kept, dropped, retuned, moved];
    if (retuned !== null) return [...kept, dropped, retuned];
    return dropped === null ? kept : [...kept, dropped];
  });
}

/**
 * Returns a run and where its round starts as the saved game keeps them,
 * read back, or throws naming what doesn't fit: a level or a first level
 * this build doesn't have, each "a level", or a run that doesn't fit it.
 */
function readReportedRun<T, N>(
  value: unknown,
  levels: readonly IdentifiedLevel[],
  { restore }: Pick<ReportReaders<T, N, unknown>, "restore">,
  name: string,
): TakenUp<T, N> {
  if (!isRecord(value)) {
    throw new Error(`${name} holds no run this build reads.`);
  }
  if (!hasKnownLevel(value, levels)) {
    throw new Error(`${name} names a level this build doesn't have.`);
  }
  const taken = restore(value);
  if (taken === null) {
    throw new Error(
      `${name} holds a run that doesn't fit level ${String(value.level)} in this build.`,
    );
  }
  return taken;
}

/** Returns a report's record read back, or throws naming what doesn't fit. */
function readRecord<T, N extends { readonly depth: number }, S, R>(
  value: unknown,
  levels: readonly IdentifiedLevel[],
  rules: Pick<ReportReaders<T, N, unknown>, "restore"> &
    Pick<ShotCodec<S, R>, "shotLength" | "readShot" | "ownRules" | "readRules">,
  level: number,
): ReadRecord<T, N, S, R> {
  const name = "The game state's record";
  const parts = partsOf(value, RECORD_PARTS, name);
  const from = readReportedRun(parts.from, levels, rules, name);
  if (from.run.level !== level) {
    throw new Error(`${name} is of another level.`);
  }
  if (!Array.isArray(parts.shots) || parts.shots.length === 0) {
    throw new Error(`${name} holds no shots.`);
  }
  const shots: readonly unknown[] = parts.shots;
  let { depth } = from.start;
  const read: ReadShot<S, R>[] = [];
  for (const [index, each] of shots.entries()) {
    const shot = readShot(each, depth, rules);
    if (shot === null) {
      throw new Error(
        `Shot ${String(index + 1)} of the game state isn't one this build plays.`,
      );
    }
    read.push(shot);
    ({ depth } = shot);
  }
  return { from, shots: read };
}

/** Returns a level's shot as a report keeps it read back, on the depth of the shot before unless it says, or null where it isn't one. */
function readShot<S, R>(
  value: unknown,
  depthBefore: number,
  codec: Pick<
    ShotCodec<S, R>,
    "shotLength" | "readShot" | "ownRules" | "readRules"
  >,
): ReadShot<S, R> | null {
  if (!Array.isArray(value)) return null;
  const entries: readonly unknown[] = value;
  const { shotLength } = codec;
  if (
    entries.length < shotLength ||
    entries.length > shotLength + MOST_AFTER_SHOT
  ) {
    return null;
  }
  const shot = codec.readShot(entries.slice(0, shotLength));
  const [dropped = null, kept = null, depth = depthBefore] =
    entries.slice(shotLength);
  if (shot === null || !isDepth(depth)) return null;
  if (dropped !== null && !isMoment(dropped)) return null;
  const rules = kept === null ? codec.ownRules : codec.readRules(kept);
  return rules === null ? null : { shot, rules, dropped, depth };
}
