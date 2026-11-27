// A level in play, as the game keeps it: the level, the seed of its deal
// and the moves made on it, which, the rules being the same every time,
// are the whole game; the game they leave is worked out from them, as a
// saved game is read back by replaying them.

import { isCount, isRecord, listOf } from "@fz/core/json";
import type { Game } from "../board/board";
import { deal } from "../board/deal";
import type { ElementId } from "../catalog/elements";
import type { ElementRule, WindRule } from "../elements/element_rule";
import type { LevelEntry } from "../levels/levels";
import { play } from "../move/play";
import type { MoveRecord, Swap } from "../move/record";

/** Describes a move as the player makes it: the square picked up and its neighbor, or the same square for a special set off where it stands, each in the screen's frame. */
export type Move = Pick<Swap, "from" | "to">;

/**
 * The version of `SavedGame`, which the shell keeps a level in play under;
 * the shell's reader drops any other.
 *
 * A key added to it later is read as optional, with a default, so a game
 * kept before it still comes back; only a change to a key it keeps now
 * takes a new version.
 */
export const SAVED_GAME_VERSION = 1;

/** Describes a level in play as storage keeps it: its level's id, its deal's seed, and each move made, as `Move` has it, from and to. */
export interface SavedGame {
  readonly level: string;
  readonly deal: number;
  readonly moves: readonly (readonly [from: number, to: number])[];
}

/** Describes the rules a level is played by: each element's, and the wind's. */
export interface PlayRules {
  readonly elements: Readonly<Record<ElementId, ElementRule>>;
  readonly wind: WindRule;
}

/** Describes a level in play: the level, the seed of its deal, each move made on it, in order, and the game they leave. */
export interface LevelInPlay {
  readonly level: LevelEntry;
  readonly deal: number;
  readonly moves: readonly Move[];
  readonly game: Game;
}

/** Describes a move played on a level: the level in play it leaves, and what the move did. */
export interface MovePlayed {
  readonly inPlay: LevelInPlay;
  readonly record: MoveRecord;
}

/** Returns a level in play on the deal a seed names, no move made. */
export function levelDealt(
  level: LevelEntry,
  seed: number,
  rules: PlayRules,
): LevelInPlay {
  return {
    level,
    deal: seed,
    moves: [],
    game: deal(level.data, seed, rules.elements),
  };
}

/**
 * Returns a move played on a level in play, and its record: a move the
 * rules refuse costs nothing, and leaves the level in play as it was.
 */
export function movePlayed(
  inPlay: LevelInPlay,
  move: Move,
  rules: PlayRules,
): MovePlayed {
  const played = play(
    inPlay.game,
    move.from,
    move.to,
    rules.elements,
    rules.wind,
  );
  if (played.record.swap.refused) {
    return { inPlay, record: played.record };
  }
  return {
    inPlay: {
      ...inPlay,
      moves: [...inPlay.moves, { from: move.from, to: move.to }],
      game: played.game,
    },
    record: played.record,
  };
}

/** Returns a level in play as storage keeps it. */
export function savedGameOf({
  level,
  deal: seed,
  moves,
}: LevelInPlay): SavedGame {
  return {
    level: level.data.id,
    deal: seed,
    moves: moves.map(({ from, to }) => [from, to]),
  };
}

/**
 * Returns the level in play a saved game replays, or null for one that
 * can't be trusted: a level the game no longer has, a deal not one of its
 * own, a move that isn't two of its squares, one that doesn't replay, or
 * moves that end the level, which no level in play has made.
 */
export function readSavedGame(
  value: unknown,
  levels: readonly LevelEntry[],
  rules: PlayRules,
): LevelInPlay | null {
  if (!isRecord(value)) return null;
  const level = levels.find(({ data }) => data.id === value["level"]);
  const seed = value["deal"];
  if (level === undefined || !isCount(seed)) return null;
  if (!level.data.deals.includes(seed)) return null;
  const dealt = levelDealt(level, seed, rules);
  const squares = dealt.game.board.pieces.length;
  const moves = listOf(value["moves"], (move) => moveOf(move, squares));
  if (moves === null) return null;
  const inPlay = replayed(dealt, moves, rules);
  return inPlay?.game.outcome === "playing" ? inPlay : null;
}

/** Returns a move read from storage, or null for one that isn't two squares of a board with so many. */
function moveOf(value: unknown, squares: number): Move | null {
  if (!Array.isArray(value)) return null;
  const squaresKept: readonly unknown[] = value;
  if (squaresKept.length !== 2) return null;
  const [from, to] = squaresKept;
  const onBoard = (square: unknown): square is number =>
    isCount(square) && square < squares;
  return onBoard(from) && onBoard(to) ? { from, to } : null;
}

/** Returns the level in play moves made on it leave, or null where the rules refuse one, as they do any once the level has ended. */
function replayed(
  dealt: LevelInPlay,
  moves: readonly Move[],
  rules: PlayRules,
): LevelInPlay | null {
  let inPlay = dealt;
  for (const move of moves) {
    const played = movePlayed(inPlay, move, rules);
    if (played.record.swap.refused) return null;
    inPlay = played.inPlay;
  }
  return inPlay;
}
