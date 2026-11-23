// The game as a bug report keeps it, as JSON, and read back: the run and
// where its round starts, as the saved game keeps them; the level's shots
// since the game began recording them, each an aim's index and a charge as
// a certificate keeps one; and the round in play, with the moment its
// playback had reached.

import { isDepth } from "@fz/brick-wall/rules/field";
import { isFiniteNumber, isRecord, unknownKey } from "@fz/core/json";
import type { CertifiedShot } from "../levels/certificate";
import { type LevelEntry, levelEntryOf } from "../levels/levels";
import {
  RULES,
  type RoundRules,
  type RoundStart,
  playRound,
} from "../round/round";
import { type Boon, type Shot, isAim, isBoon, isCharge } from "../shot";
import { type Run, levelOf, takeRound } from "./run";
import {
  type SavedGame,
  type SavedStart,
  type TakenUp,
  hasKnownLevel,
  restoreGame,
} from "./saved_game";
import { PARS, type Pars } from "./stars";

/**
 * A shot of a level as a report keeps it: the aim's index and the charge,
 * as a certificate keeps one; then, only where one applies, the moment it
 * was dropped at, the boredom it flew on where it wasn't the rules' own, and
 * the field's depth where it wasn't the shot's before, each left null where
 * a later one follows.
 */
export type ReportedShot = readonly [
  aim: number,
  charge: number,
  dropped?: number | null,
  bored?: number | null,
  depth?: number,
];

/** Describes the round in play as a report keeps it, which a load flies again from where it starts. */
export interface ReportedRound {
  readonly shot: CertifiedShot;
  /** The boon a jump earns the next shot: the level's. */
  readonly boon: Boon;
  /** How far a fuzzball flies bored, as the rules played the round. */
  readonly bored: number;
  /** The moment of its flight the playback had reached, in field units: its flight's length once it has landed. */
  readonly moment: number;
  /** The moment it was dropped at, or null for one flown whole. */
  readonly dropped: number | null;
}

/** Describes a level's shots as a report keeps them: where the record of them begins, and each shot since. */
export interface ReportedRecord {
  /**
   * The run as its first shot was released, and where that shot started,
   * as the saved game keeps them: the level's opening, or where a run taken
   * up stood.
   */
  readonly from: SavedGame;
  readonly shots: readonly ReportedShot[];
}

/**
 * Describes the game as a bug report keeps it, as JSON: the run, as it
 * stood before the round in play if one is, and where that round, or the
 * round aimed, starts, both as the saved game keeps them; the level's shots
 * before the round in play, since the game began recording them; and the
 * round in play.
 */
export interface ReportedGame {
  readonly game: SavedGame;
  /** Null where the game has recorded no shot before the round in play, or the report left them out. */
  readonly record: ReportedRecord | null;
  /** Null where no round is in play, or the report left it out. */
  readonly round: ReportedRound | null;
}

/** Describes a round as the game released it, for a report to play again. */
export interface PlayedRound {
  /** The run once the round's level started, before the round was taken in. */
  readonly started: Run;
  readonly start: RoundStart;
  readonly shot: Shot;
  /** The boon a jump earns the next shot: the level's. */
  readonly levelBoon: Boon;
  readonly rules: RoundRules;
  /** The moment it was dropped at, or null for one flown whole. */
  readonly dropped: number | null;
}

/** Describes the game as it stands, as a report takes it. */
export interface PlayedGame {
  /** The run on the board. */
  readonly run: Run;
  /** Where the round aimed, or in play, starts. */
  readonly start: RoundStart;
  /**
   * The level's rounds released since the game began recording them, as the
   * level began or a run was taken up, in order.
   */
  readonly rounds: readonly PlayedRound[];
  /** Whether the last of them is in play: released, and the next not yet aimed. */
  readonly inPlay: boolean;
  /** The moment of the round in play's flight the playback has reached. */
  readonly moment: number;
  /** Whether the run keeps no records. */
  readonly tuned: boolean;
}

/** Describes a level's shot read back from a report, ready to play again. */
export interface ReadShot {
  readonly shot: Shot;
  readonly rules: RoundRules;
  /** The moment it was dropped at, or null for one flown whole. */
  readonly dropped: number | null;
  /** The field's depth it was played on. */
  readonly depth: number;
}

/** Describes a level's shots read back from a report: the run and start the first was played from, and each in turn. */
export interface ReadRecord {
  readonly from: TakenUp;
  readonly shots: readonly ReadShot[];
}

/** Describes the round in play read back from a report, ready to fly again. */
export interface ReadRound {
  readonly shot: Shot;
  readonly levelBoon: Boon;
  readonly rules: RoundRules;
  readonly moment: number;
  readonly dropped: number | null;
}

/**
 * Describes a reported game read back: the run before the round in play, or
 * on the board, and where that round, or the round aimed, starts, paused,
 * with its level's shots and its round in play.
 */
export interface ReadGame {
  readonly game: TakenUp;
  readonly record: ReadRecord | null;
  readonly round: ReadRound | null;
}

/**
 * Describes a reported game ready for the game to take up: the run and
 * where its round starts, the rounds its level played on the way, for the
 * game to record, and the round in play to fly again.
 */
export interface ReplayedGame {
  readonly game: TakenUp;
  readonly rounds: readonly PlayedRound[];
  readonly round: ReadRound | null;
}

/**
 * Describes how a reported game shrinks to fit a report's link:
 * `at(kept)` keeps `kept` of its `most` parts, the most useful first, and
 * says what it left out.
 */
export interface ReportedTrim {
  readonly most: number;
  at(kept: number): { readonly value: ReportedGame; readonly note: string };
}

/** The parts of a report's state, so a part the type gains fails to compile until the reader knows it. */
const REPORTED_PARTS: Readonly<Record<keyof ReportedGame, true>> = {
  game: true,
  record: true,
  round: true,
};

/** The parts of a report's record. */
const RECORD_PARTS: Readonly<Record<keyof ReportedRecord, true>> = {
  from: true,
  shots: true,
};

/** The parts of a report's round in play. */
const ROUND_PARTS: Readonly<Record<keyof ReportedRound, true>> = {
  shot: true,
  boon: true,
  bored: true,
  moment: true,
  dropped: true,
};

/**
 * Returns the game as a bug report keeps it, from the game as it stands:
 * the run before the round in play, if one is, and the record of the
 * level's shots before it.
 */
export function reportedGameOf(
  played: PlayedGame,
  levels: readonly LevelEntry[],
): ReportedGame {
  const { rounds, tuned } = played;
  const inPlay = played.inPlay ? rounds.at(-1) : undefined;
  const before = inPlay === undefined ? rounds : rounds.slice(0, -1);
  const [first] = before;
  return {
    game:
      inPlay === undefined
        ? savedGameOf(played.run, played.start, levels, tuned)
        : savedGameOf(inPlay.started, inPlay.start, levels, tuned),
    record:
      first === undefined
        ? null
        : {
            from: savedGameOf(first.started, first.start, levels, tuned),
            shots: shotsOf(before),
          },
    round:
      inPlay === undefined
        ? null
        : {
            shot: [inPlay.shot.aim, inPlay.shot.charge],
            boon: inPlay.levelBoon,
            bored: inPlay.rules.bored,
            moment: played.moment,
            dropped: inPlay.dropped,
          },
  };
}

/**
 * Returns a reported game read back, its runs under a new id, paused, or
 * throws naming the first part this build can't trust: the level, the run,
 * a shot or the round in play.
 *
 * @throws Error naming the part.
 */
export function readReportedGame(
  value: unknown,
  levels: readonly LevelEntry[],
  id: number,
  pars: Pars = PARS,
): ReadGame {
  const parts = partsOf(value, REPORTED_PARTS, "The game state");
  const game = readTakenUp(parts.game, levels, id, pars, "The game state");
  const { record, round } = parts;
  return {
    game,
    record:
      record === null
        ? null
        : readRecord(record, levels, id, pars, game.run.level),
    round: round === null ? null : readRound(round),
  };
}

/**
 * Returns a reported game ready to take up, once its level's shots, played
 * again from where the record began, each as it was played, come to the
 * run and the start it keeps, with the rounds played on the way. Only a
 * brick's hits change in play, so the start it keeps is the one they come
 * to, its depth the field's since the last shot.
 *
 * @throws Error where a shot ends the level, the shots come to another
 *   run or wall than the report keeps, or the level's boon isn't the one
 *   the shot in the air flew with, as a build that plays them otherwise
 *   does.
 */
export function replayReported(
  { game, record, round }: ReadGame,
  levels: readonly LevelEntry[],
  play: typeof playRound = playRound,
): ReplayedGame {
  const { boon } = levelOf(game.run, levels);
  if (round !== null && round.levelBoon !== boon) {
    throw new Error(
      "The level in the game state has a different boon in this build.",
    );
  }
  if (record === null) return { game, rounds: [], round };
  let run: Run = { ...record.from.run, outcome: "playing" };
  let { start } = record.from;
  const rounds: PlayedRound[] = [];
  for (const [
    index,
    { shot, rules, dropped, depth },
  ] of record.shots.entries()) {
    const from = start.depth === depth ? start : { ...start, depth };
    const played = play(
      from,
      shot,
      boon,
      rules,
      dropped === null ? undefined : { stop: "drop", at: dropped },
    );
    if (played.outcome.result !== "on") {
      throw new Error(
        `Shot ${String(index + 1)} of the game state ends the level in this build.`,
      );
    }
    rounds.push({
      started: run,
      start: from,
      shot,
      levelBoon: boon,
      rules,
      dropped,
    });
    run = takeRound(run, played.outcome);
    start = played.next;
  }
  const differs = replayDiffers(run, start, game);
  if (differs !== null) {
    throw new Error(
      `The shots in the game state play out differently in this build. ${differs}`,
    );
  }
  return { game, rounds, round };
}

/**
 * Returns how a reported game shrinks to fit a report's link, where it has
 * a part to leave out: its parts, the round in play kept before the
 * level's shots.
 */
export function trimReported(reported: ReportedGame): ReportedTrim | undefined {
  const parts = [
    ...(reported.round === null ? [] : (["round"] as const)),
    ...(reported.record === null ? [] : (["record"] as const)),
  ];
  if (parts.length === 0) return undefined;
  return {
    most: parts.length,
    at: (kept) => {
      const dropped = new Set(parts.slice(kept));
      const value: ReportedGame = {
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

/** Returns a run and where its round starts as the saved game keeps them, the start left out for a level with no round played. */
function savedGameOf(
  run: Run,
  start: RoundStart,
  levels: readonly LevelEntry[],
  tuned: boolean,
): SavedGame {
  return {
    levelId: levelEntryOf(levels, run.level).data.id,
    level: run.level,
    firstLevel: run.firstLevel,
    depth: run.depth,
    rounds: run.rounds,
    jumps: run.jumps,
    banked: run.banked,
    stars: run.stars,
    score: run.score,
    tuned,
    start: run.rounds === 0 ? null : savedStartOf(start),
  };
}

/** Returns where a round starts as the saved game keeps it. */
function savedStartOf({ wall, depth, x, crew, boon }: RoundStart): SavedStart {
  return {
    hits: wall.bricks.map((brick) => (brick === null ? null : brick.hits)),
    lowestRow: wall.lowestRow,
    depth,
    x,
    friends: crew.friends,
    boon,
  };
}

/** Returns a level's rounds as a report keeps their shots, each saying only what differs from the round's before. */
function shotsOf(rounds: readonly PlayedRound[]): ReportedShot[] {
  let depth = rounds[0]?.start.depth;
  return rounds.map(({ shot, start, rules, dropped }) => {
    const moved = start.depth === depth ? null : start.depth;
    depth = start.depth;
    const bored = rules.bored === RULES.bored ? null : rules.bored;
    if (moved !== null) {
      return [shot.aim, shot.charge, dropped, bored, moved];
    }
    if (bored !== null) return [shot.aim, shot.charge, dropped, bored];
    return dropped === null
      ? [shot.aim, shot.charge]
      : [shot.aim, shot.charge, dropped];
  });
}

/**
 * Returns a value's parts, or throws where it isn't a record, holds a part
 * the reader doesn't know, or lacks one.
 */
function partsOf<Known extends string>(
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
  return value as Readonly<Record<Known, unknown>>;
}

/**
 * Returns a run and where its round starts as the saved game keeps them,
 * read back, or throws naming what doesn't fit: a level or a first level
 * this build doesn't have, each "a level".
 */
function readTakenUp(
  value: unknown,
  levels: readonly LevelEntry[],
  id: number,
  pars: Pars,
  name: string,
): TakenUp {
  if (!isRecord(value)) {
    throw new Error(`${name} holds no run this build reads.`);
  }
  if (!hasKnownLevel(value, levels)) {
    throw new Error(`${name} names a level this build doesn't have.`);
  }
  const taken = restoreGame(value, levels, id, pars);
  if (taken === null) {
    throw new Error(
      `${name} holds a run that doesn't fit level ${String(value.level)} in this build.`,
    );
  }
  return taken;
}

/** Returns a report's record read back, or throws naming what doesn't fit. */
function readRecord(
  value: unknown,
  levels: readonly LevelEntry[],
  id: number,
  pars: Pars,
  level: number,
): ReadRecord {
  const parts = partsOf(value, RECORD_PARTS, "The game state's record");
  const from = readTakenUp(
    parts.from,
    levels,
    id,
    pars,
    "The game state's record",
  );
  if (from.run.level !== level) {
    throw new Error("The game state's record is of another level.");
  }
  if (!Array.isArray(parts.shots) || parts.shots.length === 0) {
    throw new Error("The game state's record holds no shots.");
  }
  const shots: readonly unknown[] = parts.shots;
  let { depth } = from.start;
  const read: ReadShot[] = [];
  for (const [index, each] of shots.entries()) {
    const shot = readShot(each, depth);
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
function readShot(value: unknown, depthBefore: number): ReadShot | null {
  if (!Array.isArray(value) || value.length > 5) return null;
  const parts: readonly unknown[] = value;
  const [aim, charge, dropped = null, bored = null, depth = depthBefore] =
    parts;
  if (!isAim(aim) || !isCharge(charge) || !isDepth(depth)) return null;
  if (dropped !== null && !isMoment(dropped)) return null;
  if (bored !== null && !isBored(bored)) return null;
  return {
    shot: { aim, charge },
    rules: bored === null ? RULES : { bored },
    dropped,
    depth,
  };
}

/** Returns a report's round in play read back, or throws naming what doesn't fit. */
function readRound(value: unknown): ReadRound {
  const { shot, boon, bored, moment, dropped } = partsOf(
    value,
    ROUND_PARTS,
    "The game state's shot in the air",
  );
  if (!Array.isArray(shot) || shot.length !== 2) {
    throw new Error("The game state's shot in the air isn't a shot.");
  }
  const pair: readonly unknown[] = shot;
  const [aim, charge] = pair;
  if (!isAim(aim) || !isCharge(charge)) {
    throw new Error("The game state's shot in the air isn't a shot.");
  }
  if (!isBoon(boon)) {
    throw new Error(
      "The game state's shot in the air earns a boon this build doesn't have.",
    );
  }
  if (!isBored(bored)) {
    throw new Error(
      "The game state's shot in the air gets bored after a distance no round has.",
    );
  }
  if (!isMoment(moment)) {
    throw new Error(
      "The game state's shot in the air is at no moment of a flight.",
    );
  }
  if (dropped !== null && !(isMoment(dropped) && dropped <= moment)) {
    throw new Error(
      "The game state's shot in the air was dropped at no moment it had reached.",
    );
  }
  return {
    shot: { aim, charge },
    levelBoon: boon,
    rules: { bored },
    moment,
    dropped,
  };
}

/** Returns whether a value is a moment of a flight: a number from 0. */
function isMoment(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

/** Returns whether a value is a boredom a round may fly on: a number over 0. */
function isBored(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

/**
 * Says what of the run and start a record's shots came to differs from
 * what the report keeps, the first part that does, or returns null where
 * none does.
 */
function replayDiffers(
  run: Run,
  start: RoundStart,
  game: TakenUp,
): string | null {
  const kept = game.run;
  if (run.rounds !== kept.rounds) return "The shot count doesn't match.";
  if (run.jumps !== kept.jumps) return "The jump count doesn't match.";
  if (run.score !== kept.score) return "The score doesn't match.";
  const replayed = savedStartOf(start);
  const reported = savedStartOf(game.start);
  if (
    replayed.lowestRow !== reported.lowestRow ||
    JSON.stringify(replayed.hits) !== JSON.stringify(reported.hits)
  ) {
    return "The wall doesn't match.";
  }
  if (replayed.x !== reported.x) return "The fuzzball's start doesn't match.";
  if (JSON.stringify(replayed.friends) !== JSON.stringify(reported.friends)) {
    return "The friends don't match.";
  }
  return replayed.boon === reported.boon ? null : "The boon doesn't match.";
}
