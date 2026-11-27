// The proof that a deal can be cleared: a search that sees the deal, and
// so what falls in, playing every move from the few best games it kept
// after the move before, as the design's sketch's proof searches. Its
// lines are the levels' certificates, which must clear in every browser, so
// this is held as the rules are (eslint.config.js), to their fence and
// their exact arithmetic.

import type { Game } from "../rules/board/board";
import { onScreen } from "../rules/board/orientation";
import type { ElementId } from "../rules/catalog/elements";
import type { ElementRule, WindRule } from "../rules/elements/element_rule";
import { worthOf } from "../rules/move/hint";
import { play } from "../rules/move/play";
import { legalMoves } from "../rules/move/swap";
import type { Move } from "./play_out";

/** How many games the proof keeps after each move, the best by `worthOf()`. */
const KEPT_A_MOVE = 10;

/** Describes a game the proof reached, and the line that reached it. */
interface Reached {
  readonly game: Game;
  readonly line: readonly Move[];
}

/** Describes a game the proof reached, the line that reached it and what it is worth. */
interface Weighed extends Reached {
  readonly worth: number;
}

/**
 * Returns the shortest line the proof finds that clears the level from a
 * game in play, each move in the screen's frame, or null where it finds
 * none before the game's moves run out, or the game is no longer in play.
 *
 * It tries its moves, and keeps its games and breaks their ties, in the
 * sketch's order, so its lines are the sketch's certificates, move for
 * move.
 */
export function proofOf(
  game: Game,
  rules: Readonly<Record<ElementId, ElementRule>>,
  wind: WindRule,
): readonly Move[] | null {
  if (game.outcome !== "playing") {
    return null;
  }
  let kept: readonly Reached[] = [{ game, line: [] }];
  for (let turn = 0; turn < game.movesLeft && kept.length > 0; turn++) {
    const reached: Weighed[] = [];
    for (const { game: before, line } of kept) {
      for (const legal of legalMoves(before.board, rules)) {
        const move: Move = {
          from: onScreen(before, legal.from),
          to: onScreen(before, legal.to),
        };
        const after = play(before, move.from, move.to, rules, wind).game;
        const longer = [...line, move];
        if (after.outcome === "cleared") {
          return longer;
        }
        if (after.outcome === "playing") {
          reached.push({ game: after, line: longer, worth: worthOf(after) });
        }
      }
    }
    kept = reached
      .sort((first, second) => second.worth - first.worth)
      .slice(0, KEPT_A_MOVE);
  }
  return null;
}
