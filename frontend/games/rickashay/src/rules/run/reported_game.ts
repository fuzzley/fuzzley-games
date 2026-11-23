// The game as a bug report keeps it, as JSON, and read back, over
// @fz/brick-wall/rules/reported: a shot of the level kept as its aim
// alone, the library writing the field's depth beside it where it changed
// and the rules its round flew on where the debug menu retuned them; the
// level's shots played again through the game's round; and the round in
// play, with the moment its playback had reached. Rickashay drops no
// fuzzball, as Skip lands a flight whole, so a shot it reports is never
// dropped, and a report that says one was isn't one of its own.

import { type Aim, isAim } from "@fz/brick-wall/rules/aims";
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
import { isCount, isFiniteNumber, isRecord, unknownKey } from "@fz/core/json";
import { keysOf, recordOf } from "@fz/core/records";
import type { Round, RoundStart } from "../flight/events";
import type { LevelEntry } from "../levels/levels";
import type { Shot } from "../shot";
import { FLIGHT_RULES, type FlightRules } from "../tuning";
import type { Run } from "./run";
import {
  type SavedGame,
  type TakenUp,
  restoreGame,
  savedStartOf,
} from "./saved_game";
import { type LevelTally, tallied } from "./scoring";
import type { Marks } from "./stars";

/** Describes the rules a round flew on as a report keeps them: each number the debug menu moved from the rules' own. */
export type RetunedRules = Readonly<Partial<FlightRules>>;

/** Describes the round in play as a report keeps it, which a load flies again from where it starts. */
export interface ReportedRound {
  /** Its shot, as the report keeps a shot: its aim. */
  readonly shot: readonly [Aim];
  /** The rules it flew on, where the debug menu retuned them, or null for the rules' own. */
  readonly rules: RetunedRules | null;
  /** The moment of its flight the playback had reached, in field units: its flight's length once it has landed. */
  readonly moment: number;
}

/**
 * Describes the game as a bug report keeps it, as JSON, as
 * `@fz/brick-wall/rules/reported` says: the run and where its round starts
 * as the saved game keeps them, the level's shots, and the round in play.
 */
export type ReportedGame = WallReportedGame<SavedGame, ReportedRound>;

/** Describes a round as the game released it, for a report to play again: flown whole, as the game drops no fuzzball. */
export type PlayedRound = ReleasedRound<
  LevelTally,
  RoundStart,
  Shot,
  FlightRules
> & { readonly dropped: null };

/** Describes the game as it stands, as a report takes it. */
export interface PlayedGame extends ReportedPlay<
  LevelTally,
  RoundStart,
  PlayedRound
> {
  /** The moment of the round in play's flight the playback has reached. */
  readonly moment: number;
}

/** Describes the round in play read back from a report, ready to fly again. */
export interface ReadRound {
  readonly shot: Shot;
  readonly rules: FlightRules;
  readonly moment: number;
}

/**
 * Describes a reported game read back: the run before the round in play, or
 * on the board, and where that round, or the round aimed, starts, paused,
 * with its level's shots and its round in play.
 */
export type ReadGame = ReadReport<
  LevelTally,
  RoundStart,
  Shot,
  FlightRules,
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

/** Plays a round of a shot from where it starts, on the rules given, as the game's round does. */
export type RoundPlayer = (
  start: RoundStart,
  shot: Shot,
  rules: FlightRules,
) => Pick<Round, "outcome" | "next">;

/** The names of the rules' numbers, which a report's retuned rules may name and no other. */
const RULE_NAMES = keysOf(FLIGHT_RULES);

/** The names of the rules' numbers, as `unknownKey()` reads them. */
const RULE_KEYS = recordOf(RULE_NAMES, () => true as const);

/** Returns whether a value is a count of at least so many, as a number of turns, holds or hits is. */
function countFrom(least: number): (value: unknown) => value is number {
  return (value): value is number => isCount(value) && value >= least;
}

/** Returns whether a value is a length over nothing, in field units. */
function isLength(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

/**
 * Each of the rules' numbers, with what a report may set it to: a count of
 * turns, holds, hits or floor bounces, of at least one where none would
 * stop a flight's rule from working, or a length over nothing, or from
 * nothing for how far the guide runs past its last turn.
 */
const RULE_CHECKS: Readonly<
  Record<keyof FlightRules, (value: unknown) => value is number>
> = {
  bored: isLength,
  longest: isLength,
  stillTurns: countFrom(1),
  firstBounce: countFrom(1),
  bounceStep: countFrom(0),
  mostBounces: countFrom(0),
  hotHits: countFrom(1),
  hotBounces: countFrom(0),
  hatchHolds: countFrom(1),
  boltTurns: countFrom(1),
  guideTurns: countFrom(1),
  guidePast: (value): value is number => isFiniteNumber(value) && value >= 0,
};

/** How a report keeps a shot of the level, its aim alone, and the rules its round flew on where they weren't the rules' own. */
const SHOT_CODEC: ShotCodec<Shot, FlightRules> = {
  shotLength: 1,
  keepShot: keptShotOf,
  readShot: ([aim]) => (isAim(aim) ? { aim } : null),
  ownRules: FLIGHT_RULES,
  keepRules: retunedOf,
  readRules,
};

/** The parts of a report's round in play. */
const ROUND_PARTS: Readonly<Record<keyof ReportedRound, true>> = {
  shot: true,
  rules: true,
  moment: true,
};

/**
 * Returns the game as a bug report keeps it, from the game as it stands:
 * the run before the round in play, if one is, the record of the level's
 * shots before it, and the round in play.
 */
export function reportedGameOf(
  played: PlayedGame,
  levels: readonly LevelEntry[],
): ReportedGame {
  const rules = { ...SHOT_CODEC, keptStart: savedStartOf };
  return reportOf(played, levels, rules, (inPlay) => ({
    shot: keptShotOf(inPlay.shot),
    rules: retunedOf(inPlay.rules),
    moment: played.moment,
  }));
}

/**
 * Returns a reported game read back, its runs under a new id, paused, their
 * pars worked out from the marks, or throws naming the first part this
 * build can't trust: the level, the run, a shot or the round in play. A
 * report filed before the game kept its state holds none, which it refuses
 * too.
 *
 * @throws Error naming the part.
 */
export function readReportedGame(
  value: unknown,
  levels: readonly LevelEntry[],
  id: number,
  marks: Marks,
): ReadGame {
  if (value === null) {
    throw new Error(
      "The report has no game state. It was filed before Rickashay put the game state in reports.",
    );
  }
  return readReport(value, levels, {
    ...SHOT_CODEC,
    restore: (kept) => restoreGame(kept, levels, id, marks),
    readRound,
  });
}

/**
 * Returns a reported game ready to take up, once its level's shots, played
 * again from where the record began, each as it was played, come to the
 * run and the start it keeps, with the rounds played on the way.
 *
 * @throws Error where a shot was dropped, a shot ends the level, or the
 *   shots come to another run or wall than the report keeps, as a build
 *   that plays them otherwise does.
 */
export function replayReported(
  { game, record, round }: ReadGame,
  play: RoundPlayer,
): ReplayedGame {
  if (record === null) return { game, rounds: [], round };
  const dropped = record.shots.findIndex((shot) => shot.dropped !== null);
  if (dropped !== -1) {
    throw new Error(
      `Shot ${String(dropped + 1)} of the game state was dropped. Rickashay has no Drop.`,
    );
  }
  const rounds = replayRecord(record, game, {
    tallied,
    play,
    differs: replayDiffers,
  });
  return {
    game,
    rounds: rounds.map((each) => ({ ...each, dropped: null })),
    round,
  };
}

/** Returns a shot as a report keeps it: its aim. */
function keptShotOf({ aim }: Shot): readonly [Aim] {
  return [aim];
}

/** Returns the numbers of the rules a round flew on that the debug menu moved from the rules' own, or null where it moved none. */
function retunedOf(rules: FlightRules): RetunedRules | null {
  const moved = RULE_NAMES.filter((name) => rules[name] !== FLIGHT_RULES[name]);
  if (moved.length === 0) return null;
  return Object.fromEntries(moved.map((name) => [name, rules[name]]));
}

/**
 * Returns the rules a round flew on, from what a report keeps of them, or
 * null where they aren't rules a round flies on: a record naming only the
 * rules' numbers, each one {@link RULE_CHECKS} lets a report set it to.
 */
function readRules(kept: unknown): FlightRules | null {
  if (!isRecord(kept) || unknownKey(kept, RULE_KEYS) !== null) return null;
  const rules: Record<keyof FlightRules, number> = { ...FLIGHT_RULES };
  for (const name of RULE_NAMES) {
    const value = kept[name];
    if (value === undefined) continue;
    if (!RULE_CHECKS[name](value)) return null;
    rules[name] = value;
  }
  return rules;
}

/** Returns a report's round in play read back, or throws naming what doesn't fit. */
function readRound(value: unknown): ReadRound {
  const { shot, rules, moment } = partsOf(
    value,
    ROUND_PARTS,
    "The game state's shot in the air",
  );
  const flown = readKeptShot(shot, SHOT_CODEC);
  if (flown === null) {
    throw new Error("The game state's shot in the air isn't a shot.");
  }
  const flownOn = rules === null ? FLIGHT_RULES : readRules(rules);
  if (flownOn === null) {
    throw new Error(
      "The game state's shot in the air flew on rules this build doesn't have.",
    );
  }
  if (!isMoment(moment)) {
    throw new Error(
      "The game state's shot in the air is at no moment of a flight.",
    );
  }
  return { shot: flown, rules: flownOn, moment };
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
  if (run.rounds !== kept.rounds) return "The round count doesn't match.";
  if (run.tally.jumps !== kept.tally.jumps) {
    return "The jump count doesn't match.";
  }
  if (run.tally.earned !== kept.tally.earned) {
    return "The floor bounce count doesn't match.";
  }
  if (run.tally.bestRally !== kept.tally.bestRally) {
    return "The best rally doesn't match.";
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
  return replayed.hot === reported.hot ? null : "The hot shot doesn't match.";
}
