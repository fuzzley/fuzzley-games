// The hint, the careful player's move: each legal move pictured on two
// guesses at what falls in, and the one whose games look best kept. It
// can't see the deal, so a hint gives nothing away of what falls in.

import { itemAt } from "@fz/core/records";
import type { Game } from "../board/board";
import { squareOf } from "../board/cells";
import { onScreen } from "../board/orientation";
import type { ElementId } from "../catalog/elements";
import type { ElementGoalId } from "../catalog/goals";
import { GUESS_MASKS } from "../draws";
import type { ElementRule, WindRule } from "../elements/element_rule";
import { CAREFUL_WEIGHTS } from "../tuning";
import { play } from "./play";
import type { Swap } from "./record";
import { legalMoves } from "./swap";

/**
 * Returns how good a game looks to the careful player: a cleared game by
 * the moves it has left, and any other by what its goals still need, what
 * stands ready to go off and what is in the way.
 *
 * Its weights are the sketch's own decimals, added in the sketch's order,
 * goal by goal and then square by square, since a sum of decimals rounds
 * at each step: only the same terms in the same order make the same sums,
 * and break the careful player's ties, on which the levels' stars rest, as
 * the sketch's are broken.
 */
export function worthOf(game: Game): number {
  if (game.outcome === "cleared") {
    return CAREFUL_WEIGHTS.cleared + game.movesLeft * CAREFUL_WEIGHTS.moveLeft;
  }
  const { board, goals, goalsLeft } = game;
  let worth = 0;
  for (const [place, goal] of goals.entries()) {
    worth -=
      Math.max(0, itemAt(goalsLeft, place)) * CAREFUL_WEIGHTS.goals[goal.what];
  }
  const needs = (what: ElementGoalId): boolean =>
    goals.some(
      (goal, place) => goal.what === what && itemAt(goalsLeft, place) > 0,
    );
  const needsBricks = needs("brick");
  const needsSleepyheads = needs("sleepyhead");
  for (const [square, piece] of board.pieces.entries()) {
    if (piece?.what === "frizzball") {
      worth += CAREFUL_WEIGHTS.ready.frizzball;
    } else if (piece?.what === "fuzzball") {
      if (piece.special !== null) {
        worth += CAREFUL_WEIGHTS.ready[piece.special];
      }
      if (piece.burred) {
        worth -= CAREFUL_WEIGHTS.burr;
      }
    } else if (piece?.what === "brick" && needsBricks) {
      worth -= piece.layers * CAREFUL_WEIGHTS.brickLayer;
    } else if (piece?.what === "sleepyhead" && needsSleepyheads) {
      const { y } = squareOf(square, board.width);
      worth -= (board.height - 1 - y) * CAREFUL_WEIGHTS.sleepyheadRow;
    }
  }
  return worth;
}

/**
 * Returns the move the careful player makes on a game, in the screen's
 * frame, or null where the game is no longer in play or its board has no
 * move: of every legal move, in `legalMoves()`' order, the first whose
 * games, the move played on each of two guesses at what falls in, are
 * worth the most together.
 */
export function carefulMove(
  game: Game,
  rules: Readonly<Record<ElementId, ElementRule>>,
  wind: WindRule,
): Pick<Swap, "from" | "to"> | null {
  if (game.outcome !== "playing") {
    return null;
  }
  let best: Pick<Swap, "from" | "to"> | null = null;
  let bestWorth = -Infinity;
  for (const move of legalMoves(game.board, rules)) {
    const from = onScreen(game, move.from);
    const to = onScreen(game, move.to);
    let worth = 0;
    for (const mask of GUESS_MASKS) {
      const guessed = { ...game, seed: (game.seed ^ mask) >>> 0 };
      worth += worthOf(play(guessed, from, to, rules, wind).game);
    }
    if (worth > bestWorth) {
      best = { from, to };
      bestWorth = worth;
    }
  }
  return best;
}
