// The game as a bug report keeps it, as JSON, and read back, over
// `@fz/brick-wall/rules/reported`: a shot of the level kept as an aim's
// index and a charge, as a certificate keeps one, and played again through
// the game's round, and the round in play, with the boon its level earns
// and the moment its playback had reached.

import { isAim } from "@fz/brick-wall/rules/aims";
import type { Pars } from "@fz/brick-wall/rules/par";
import {
  type ReadReport,
  type ReleasedRound,
  type ReportedGame as WallReportedGame,
  type ReportedPlay,
  type ShotCodec,
  isMoment,
  partsOf,
  readKeptShot,
  readReport,
  replayRecord,
  reportOf,
} from "@fz/brick-wall/rules/reported";
import { isFiniteNumber } from "@fz/core/json";
import type { CertifiedShot } from "../levels/certificate";
import type { LevelEntry } from "../levels/levels";
import {
  RULES,
  type RoundRules,
  type RoundStart,
  playRound,
} from "../round/round";
import { type Boon, type Shot, isBoon, isCharge } from "../shot";
import { type LevelCounts, RUN_RULES, type Run, levelOf } from "./run";
import {
  type SavedGame,
  type TakenUp,
  restoreGame,
  savedStartOf,
} from "./saved_game";
import { PARS } from "./stars";

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

/**
 * Describes the game as a bug report keeps it, as JSON, as
 * `@fz/brick-wall/rules/reported` says: the run and where its round starts
 * as the saved game keeps them, the level's shots, and the round in play.
 */
export type ReportedGame = WallReportedGame<SavedGame, ReportedRound>;

/** Describes a round as the game released it, for a report to play again. */
export type PlayedRound = ReleasedRound<
  LevelCounts,
  RoundStart,
  Shot,
  RoundRules
>;

/** Describes the game as it stands, as a report takes it. */
export interface PlayedGame extends ReportedPlay<
  LevelCounts,
  RoundStart,
  PlayedRound
> {
  /** The moment of the round in play's flight the playback has reached. */
  readonly moment: number;
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
export type ReadGame = ReadReport<
  LevelCounts,
  RoundStart,
  Shot,
  RoundRules,
  ReadRound
>;

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
 * How a report keeps a shot of the level, as a certificate keeps one, and
 * the boredom its round flew on, where it wasn't the rules' own.
 */
const SHOT_CODEC: ShotCodec<Shot, RoundRules> = {
  shotLength: 2,
  keepShot: certifiedShotOf,
  readShot: ([aim, charge]) =>
    isAim(aim) && isCharge(charge) ? { aim, charge } : null,
  ownRules: RULES,
  keepRules: ({ bored }) => (bored === RULES.bored ? null : bored),
  readRules: (kept) => (isBored(kept) ? { bored: kept } : null),
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
  const rules = { ...SHOT_CODEC, keptStart: savedStartOf };
  return reportOf(played, levels, rules, (inPlay) => ({
    shot: certifiedShotOf(inPlay.shot),
    boon: levelOf(inPlay.started, levels).boon,
    bored: inPlay.rules.bored,
    moment: played.moment,
    dropped: inPlay.dropped,
  }));
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
  return readReport(value, levels, {
    ...SHOT_CODEC,
    restore: (kept) => restoreGame(kept, levels, id, pars),
    readRound,
  });
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
  const rounds = replayRecord(record, game, {
    ...RUN_RULES,
    play: (start, shot, rules, dropped) =>
      play(
        start,
        shot,
        boon,
        rules,
        dropped === null ? undefined : { stop: "drop", at: dropped },
      ),
    differs: replayDiffers,
  });
  return { game, rounds, round };
}

/** Returns a report's round in play read back, or throws naming what doesn't fit. */
function readRound(value: unknown): ReadRound {
  const { shot, boon, bored, moment, dropped } = partsOf(
    value,
    ROUND_PARTS,
    "The game state's shot in the air",
  );
  const flown = readKeptShot(shot, SHOT_CODEC);
  if (flown === null) {
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
    shot: flown,
    levelBoon: boon,
    rules: { bored },
    moment,
    dropped,
  };
}

/** Returns a shot as a certificate keeps it: its aim's index and its charge. */
function certifiedShotOf({ aim, charge }: Shot): CertifiedShot {
  return [aim, charge];
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
  if (run.tally.jumps !== kept.tally.jumps) {
    return "The jump count doesn't match.";
  }
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
