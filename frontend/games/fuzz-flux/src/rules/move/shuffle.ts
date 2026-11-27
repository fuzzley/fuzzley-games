// The shuffle, where a move leaves the board with no move to make: its
// plain fuzzballs trade places, in an order drawn afresh at each try, until
// the board has a move and no bunch standing, or the tries run out and the
// last order stays.

import { hashOf } from "@fz/core/random";
import { itemAt } from "@fz/core/records";
import type { Game } from "../board/board";
import { findBunches } from "../bunches/find";
import type { ElementId } from "../catalog/elements";
import { SALTS } from "../draws";
import type { ElementRule } from "../elements/element_rule";
import { SHUFFLE_TRIES } from "../tuning";
import type { Shuffled } from "./record";
import { hasLegalMove, plainFuzzballs } from "./swap";

/** Describes a game whose plain fuzzballs have traded places, and how. */
export interface ShuffledGame {
  readonly game: Game;
  /** Each plain fuzzball, where it was and where it went, in the board's own frame, by its first square. */
  readonly moves: readonly Shuffled[];
}

/**
 * Returns a game with its plain fuzzballs traded among their squares: at
 * each try, each draws a key from the deal's seed, the moves played and its
 * place in the board's order, and they take their squares in the order of
 * their keys, until a try leaves a move and no bunch, or the last try
 * stays.
 */
export function shuffle(
  game: Game,
  rules: Readonly<Record<ElementId, ElementRule>>,
): ShuffledGame {
  const { board } = game;
  const plain = plainFuzzballs(board, rules);
  const squares = plain.map(({ square }) => square);
  let order: readonly number[] = squares;
  let shuffled = board;
  for (let attempt = 0; attempt < SHUFFLE_TRIES; attempt++) {
    order = drawnOrder(game, squares, attempt);
    const pieces = [...board.pieces];
    for (const [place, square] of order.entries()) {
      pieces[square] = itemAt(plain, place).piece;
    }
    shuffled = { ...board, pieces };
    if (
      findBunches(shuffled, null).length === 0 &&
      hasLegalMove(shuffled, rules)
    ) {
      break;
    }
  }
  return {
    game: { ...game, board: shuffled },
    moves: plain.map(({ square, piece }, place) => ({
      piece: piece.id,
      from: square,
      to: itemAt(order, place),
    })),
  };
}

/** Returns the squares a try of the shuffle takes, a fuzzball's at its place: the fuzzballs' squares in the order of the keys they draw, a tie by their places. */
function drawnOrder(
  { seed, movesPlayed }: Game,
  squares: readonly number[],
  attempt: number,
): readonly number[] {
  return squares
    .map((square, place) => ({
      square,
      place,
      key: hashOf(seed, movesPlayed, place, SALTS.shuffle + attempt),
    }))
    .sort((a, b) => a.key - b.key || a.place - b.place)
    .map(({ square }) => square);
}
