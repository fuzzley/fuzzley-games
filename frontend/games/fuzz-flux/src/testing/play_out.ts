// A game played to its end by one of the players a level is measured by,
// a move of the player's choosing at a time: whether it cleared the level,
// the moves it used, the line it played and what each move did. The
// report's games are played through this, so it is held as the rules are
// (eslint.config.js), to their fence and their exact arithmetic.

import type { Game } from "../rules/board/board";
import type { ElementId } from "../rules/catalog/elements";
import type { ElementRule, WindRule } from "../rules/elements/element_rule";
import { play } from "../rules/move/play";
import type { MoveRecord, Swap } from "../rules/move/record";

/** Describes a move a player makes: the square it picks up and the neighbor it swaps it with. */
export type Move = Pick<Swap, "from" | "to">;

/** Chooses the move a player makes on a game in play, or null where it makes none. */
type Player = (game: Game) => Move | null;

/** Describes a game a player played to its end. */
export interface PlayedOut {
  readonly cleared: boolean;
  /** How many of the moves it was dealt it used. */
  readonly used: number;
  /** Each move it made, in the order made. */
  readonly line: readonly Move[];
  /** What each move did, in the line's order. */
  readonly records: readonly MoveRecord[];
}

/**
 * Returns a game played on, by the elements' rules and the wind's, with
 * each move a player chooses, in the screen's frame, until the level is
 * cleared or over or the player makes no move.
 *
 * @throws {Error} for a move `play()` refuses, which would leave the game
 *   as it was and its player choosing it again for good.
 */
export function playOut(
  game: Game,
  player: Player,
  rules: Readonly<Record<ElementId, ElementRule>>,
  wind: WindRule,
): PlayedOut {
  const line: Move[] = [];
  const records: MoveRecord[] = [];
  let playing = game;
  while (playing.outcome === "playing") {
    const move = player(playing);
    if (move === null) {
      break;
    }
    const played = play(playing, move.from, move.to, rules, wind);
    if (played.record.swap.refused) {
      throw new Error(
        `A player made a move the rules refuse, ${String(move.from)} to ${String(move.to)}.`,
      );
    }
    line.push(move);
    records.push(played.record);
    playing = played.game;
  }
  return {
    cleared: playing.outcome === "cleared",
    used: game.movesLeft - playing.movesLeft,
    line,
    records,
  };
}
