// A level in play as a bug report keeps it (C3): the level, the seed of its
// deal and the moves made on it, as a saved game keeps them, so the game a
// report was filed from replays exactly. Unlike a saved game, a report can
// hold a level that has ended, and the reader says what it can't trust
// rather than dropping the game in silence.

import { count } from "@fz/core/format";
import { isCount, isRecord, unknownKey } from "@fz/core/json";
import type { Outcome } from "../board/board";
import type { LevelEntry } from "../levels/levels";
import {
  type LevelInPlay,
  type PlayRules,
  type SavedGame,
  levelDealt,
  moveOf,
  movePlayed,
  savedGameOf,
} from "./saved_game";

/**
 * The tag a reported game is packed under, `ff` and the version of its
 * shape. A change to the shape of {@link ReportedGame} takes the next one,
 * `ff2`.
 */
export const REPORT_TAG = "ff1";

/** Describes a level in play as a bug report packs it: its level's id, its deal's seed, and each move made, from and to, as a saved game keeps them. */
export type ReportedGame = SavedGame;

/** Every part of a packed game, so a reader names one it doesn't know. */
const PARTS: Readonly<Record<keyof ReportedGame, true>> = {
  level: true,
  deal: true,
  moves: true,
};

/** What a summary calls each way a level can stand. */
const OUTCOME_WORDS: Readonly<Record<Outcome, string>> = {
  playing: "In play",
  cleared: "Cleared",
  over: "Out of moves",
};

/** Returns a level in play as a bug report packs it. */
export function reportedGameOf(inPlay: LevelInPlay): ReportedGame {
  return savedGameOf(inPlay);
}

/**
 * Returns the level in play a reported game replays, at the end of a level
 * where its moves ended it.
 *
 * @throws Error naming the first part this build can't read: a level it
 *   doesn't have, a deal not one of the level's, a move that isn't two of
 *   its squares or that doesn't replay, as none does once the level has
 *   ended, or a part it doesn't know.
 */
export function readReportedGame(
  value: unknown,
  levels: readonly LevelEntry[],
  rules: PlayRules,
): LevelInPlay {
  if (!isRecord(value)) {
    throw new Error("This build can't read the game state.");
  }
  const level = levels.find(({ data }) => data.id === value["level"]);
  if (level === undefined) throw unreadable("level");
  const seed = value["deal"];
  if (!isCount(seed) || !level.data.deals.includes(seed)) {
    throw unreadable("deal");
  }
  const moves = value["moves"];
  if (!Array.isArray(moves)) throw unreadable("moves");
  const unknown = unknownKey(value, PARTS);
  if (unknown !== null) {
    throw new Error(
      `The game state has a part this build doesn't know: ${unknown}.`,
    );
  }
  const kept: readonly unknown[] = moves;
  return kept.reduce<LevelInPlay>(
    (inPlay, move, index) => replayed(inPlay, move, index + 1, rules),
    levelDealt(level, seed, rules),
  );
}

/**
 * Returns a reported game in one line, for people: "Level 3: Show me ·
 * deal 2 · 4 moves made · 2 moves left · In play".
 */
export function reportSummary({
  level,
  deal,
  moves,
  game,
}: LevelInPlay): string {
  return [
    `Level ${String(level.number)}: ${level.data.name}`,
    `deal ${String(deal)}`,
    `${count(moves.length, "move", "moves")} made`,
    `${count(game.movesLeft, "move", "moves")} left`,
    OUTCOME_WORDS[game.outcome],
  ].join(" · ");
}

/**
 * Returns the level in play a move read from the state leaves, the move
 * counted from 1.
 *
 * @throws Error saying which move isn't two of the board's squares, or
 *   isn't one the rules allow.
 */
function replayed(
  inPlay: LevelInPlay,
  value: unknown,
  number: number,
  rules: PlayRules,
): LevelInPlay {
  const move = moveOf(value, inPlay.game.board.pieces.length);
  if (move === null) throw unreadable(`move ${String(number)}`);
  const played = movePlayed(inPlay, move, rules);
  if (played.record.swap.refused) {
    throw new Error(
      `Move ${String(number)} in the game state isn't a move the rules allow.`,
    );
  }
  return played.inPlay;
}

/** Returns the error that names a part of the state this build can't read. */
function unreadable(part: string): Error {
  return new Error(`This build can't read ${part} in the game state.`);
}
