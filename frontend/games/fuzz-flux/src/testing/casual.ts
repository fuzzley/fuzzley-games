// The casual player: most often the move that looks best at a glance,
// before anything falls, and otherwise any move at all, chosen as the
// design's sketch's casual player chooses, roll for roll of the same dice.
// Its games set each level's moves and pick its deals, so this is held as
// the rules are (eslint.config.js), to their fence and their exact
// arithmetic.

import { itemAt } from "@fz/core/records";
import type { Board, Game } from "../rules/board/board";
import { onScreen } from "../rules/board/orientation";
import { findBunches } from "../rules/bunches/find";
import type { ElementId } from "../rules/catalog/elements";
import type { KindId } from "../rules/catalog/kinds";
import type { Piece } from "../rules/catalog/pieces";
import type { ElementRule, WindRule } from "../rules/elements/element_rule";
import { goesOff, legalMoves, swappedOn } from "../rules/move/swap";
import type { Dice } from "./dice";
import { type Move, type PlayedOut, playOut } from "./play_out";

/** The sides of each die the casual player rolls: a hundred, so its care is out of a hundred. */
const SIDES = 100;

/** The casual player's care: on a roll under it, it makes the move that looks best, and on any other, any move. */
const CARE = 65;

/** What the roll that nudges each move's look is divided by, so a nudge comes to under half a point and the dice choose between moves that look alike. */
const NUDGE_OVER = 200;

/** What the casual player sees in a move at a glance, in the sketch's own decimals. */
const LOOK = {
  /** What each of the two pieces swapped adds where it goes off: a special or the frizzball. */
  goesOff: 4,
  /** What each fuzzball a bunch takes in adds. */
  bunched: 1,
  /** What a bunch that makes a special adds. */
  makes: 3,
  /** What a bunch of a kind a goal still gathers adds. */
  wanted: 1.5,
  /** What each square of a bunch adds that has dust on it. */
  dust: 1,
  /** What each caged fuzzball of a bunch adds. */
  caged: 2,
  /** What each sleepyhead above a square of a bunch, in its column, adds. */
  sleepyheadAbove: 1.5,
  /** What each brick or burred fuzzball beside a square of a bunch adds, once for each square of the bunch it is beside. */
  inTheWay: 0.7,
} as const;

/**
 * Returns how a move on a game looks at a glance, before anything falls:
 * each of the pieces it swaps that goes off, and what each bunch the swap
 * stands up takes in, makes and touches.
 *
 * Its terms are added in the sketch's order, bunch by bunch and square by
 * square, since a sum of decimals rounds at each step: only the same terms
 * in the same order make the same sums, and break the casual player's ties
 * as the sketch's are broken.
 *
 * @param move The move in the board's own frame, as `legalMoves()` gives it.
 */
export function lookOf(game: Game, { from, to }: Move): number {
  const { board } = game;
  let look = 0;
  for (const square of [from, to]) {
    if (goesOff(itemAt(board.pieces, square))) {
      look += LOOK.goesOff;
    }
  }
  const swapped = swappedOn(board, from, to);
  for (const bunch of findBunches(swapped, { from, to })) {
    look += bunch.squares.length * LOOK.bunched;
    if (bunch.makes !== null) {
      look += LOOK.makes;
    }
    if (stillGathers(game, bunch.kind)) {
      look += LOOK.wanted;
    }
    for (const square of bunch.squares) {
      look = withSquare(look, swapped, square);
    }
  }
  return look;
}

/**
 * Returns the move the casual player makes on a game, in the screen's
 * frame, or null where the game is no longer in play or its board has no
 * move: on a roll under its care, of every legal move, in `legalMoves()`'
 * order, the first that looks best by `lookOf()`, each look nudged by a
 * roll of its own; on any other roll, the legal move a second roll draws.
 */
export function casualMove(
  game: Game,
  dice: Dice,
  rules: Readonly<Record<ElementId, ElementRule>>,
): Move | null {
  if (game.outcome !== "playing") {
    return null;
  }
  const moves = legalMoves(game.board, rules);
  if (moves.length === 0) {
    return null;
  }
  const move =
    dice(SIDES) < CARE
      ? bestLooking(game, moves, dice)
      : itemAt(moves, dice(moves.length));
  return { from: onScreen(game, move.from), to: onScreen(game, move.to) };
}

/** Returns a game played to its end by the casual player, by the elements' rules and the wind's, on the dice handed in. */
export function playCasually(
  game: Game,
  dice: Dice,
  rules: Readonly<Record<ElementId, ElementRule>>,
  wind: WindRule,
): PlayedOut {
  return playOut(
    game,
    (playing) => casualMove(playing, dice, rules),
    rules,
    wind,
  );
}

/** Returns the first of a game's moves, in the board's own frame, that looks best, each look nudged by a roll in the moves' order. */
function bestLooking(game: Game, moves: readonly Move[], dice: Dice): Move {
  const looks = moves.map(
    (move) => lookOf(game, move) + dice(SIDES) / NUDGE_OVER,
  );
  return itemAt(moves, looks.indexOf(Math.max(...looks)));
}

/**
 * Returns a move's look so far with a square of a bunch added, a term at a
 * time: its dust, its cage, each sleepyhead above it and each brick or
 * burred fuzzball beside it.
 *
 * The squares beside it are those before and after it in the board's
 * order, and above and below, so the last square of a row stands beside
 * the first of the next, as the sketch's glance has it: the levels' moves
 * were set by the choices that makes.
 */
function withSquare(look: number, board: Board, square: number): number {
  const { width } = board;
  let sum = look;
  if (itemAt(board.dust, square) > 0) {
    sum += LOOK.dust;
  }
  const piece = pieceAt(board, square);
  if (piece?.what === "fuzzball" && piece.caged) {
    sum += LOOK.caged;
  }
  for (let above = square - width; above >= 0; above -= width) {
    if (pieceAt(board, above)?.what === "sleepyhead") {
      sum += LOOK.sleepyheadAbove;
    }
  }
  for (const beside of [
    square - 1,
    square + 1,
    square - width,
    square + width,
  ]) {
    if (isInTheWay(pieceAt(board, beside))) {
      sum += LOOK.inTheWay;
    }
  }
  return sum;
}

/** Returns whether a goal of a game still gathers fuzzballs of a kind. */
function stillGathers(game: Game, kind: KindId): boolean {
  return game.goals.some(
    (goal, place) =>
      goal.what === "gather" &&
      goal.kind === kind &&
      itemAt(game.goalsLeft, place) > 0,
  );
}

/** Returns whether a piece stands in the way of a bunch beside it: a brick or a burred fuzzball. */
function isInTheWay(piece: Piece | null): boolean {
  return (
    piece?.what === "brick" || (piece?.what === "fuzzball" && piece.burred)
  );
}

/** Returns what a board holds at an index, or null for one past either end of its squares. */
function pieceAt(board: Board, square: number): Piece | null {
  return board.pieces[square] ?? null;
}
