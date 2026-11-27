// A random player's games: a deal of a level, and moves drawn at random
// from those its board allows, played to the level's end.

import { itemAt } from "@fz/core/records";
import type { Game } from "../rules/board/board";
import { deal } from "../rules/board/deal";
import { onScreen } from "../rules/board/orientation";
import type { ElementId } from "../rules/catalog/elements";
import type { ElementRule, WindRule } from "../rules/elements/element_rule";
import type { Level } from "../rules/levels/level";
import { type Played, play } from "../rules/move/play";
import { legalMoves } from "../rules/move/swap";

/** Describes a move of a random game: the game it was played on, its squares in the screen's frame, and what playing it made. */
export interface RandomMove {
  readonly game: Game;
  readonly from: number;
  readonly to: number;
  readonly played: Played;
}

/**
 * Returns each move of a random game on a deal of a level, a draw each,
 * until the level is cleared or over, or a move leaves the game in play
 * with no move to make, as none should.
 */
export function randomGame(
  level: Level,
  seed: number,
  random: () => number,
  rules: Readonly<Record<ElementId, ElementRule>>,
  wind: WindRule,
): readonly RandomMove[] {
  const moves: RandomMove[] = [];
  let game = deal(level, seed, rules);
  while (game.outcome === "playing") {
    const legal = legalMoves(game.board, rules);
    if (legal.length === 0) {
      break;
    }
    const drawn = itemAt(legal, Math.floor(random() * legal.length));
    const from = onScreen(game, drawn.from);
    const to = onScreen(game, drawn.to);
    const played = play(game, from, to, rules, wind);
    moves.push({ game, from, to, played });
    game = played.game;
  }
  return moves;
}
