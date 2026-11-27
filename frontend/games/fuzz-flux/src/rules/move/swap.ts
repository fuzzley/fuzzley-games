// The swap: which pieces can be picked up, which swaps of two neighbors are
// moves, every move a board allows, and which fuzzballs could bunch with
// one picked up. What keeps a piece from being swapped is each element's
// rule; a swap is a move where it moves a special or the frizzball, or
// makes a bunch, but never the frizzball with a piece that is no fuzzball.

import { itemAt } from "@fz/core/records";
import type { Board, Game } from "../board/board";
import { neighborsOf } from "../board/cells";
import { fromScreen, onScreen } from "../board/orientation";
import { bunchesAs, findBunches, standsInBunch } from "../bunches/find";
import { ELEMENT_IDS, type ElementId } from "../catalog/elements";
import type { Piece } from "../catalog/pieces";
import type { ElementRule } from "../elements/element_rule";
import type { Swap } from "./record";

/** Returns whether a square's piece can be picked up and swapped: a piece no element's rule holds. */
export function canSwap(
  board: Board,
  square: number,
  rules: Readonly<Record<ElementId, ElementRule>>,
): boolean {
  const piece = itemAt(board.pieces, square);
  if (piece === null) {
    return false;
  }
  const state = { piece, dust: itemAt(board.dust, square) };
  return !ELEMENT_IDS.some((id) => rules[id].holdsSwap?.(state) === true);
}

/**
 * Returns whether swapping two neighbors makes a move: a swap that moves a
 * special or the frizzball, or makes a bunch, and never one of two
 * fuzzballs of a kind, nor one of the frizzball and a piece that is no
 * fuzzball, which has no kind for it to take.
 *
 * It asks nothing of whether each can be picked up, which `canSwap()` says.
 */
export function swapWorks(board: Board, from: number, to: number): boolean {
  const picked = itemAt(board.pieces, from);
  const neighbor = itemAt(board.pieces, to);
  if (picked?.what === "frizzball" || neighbor?.what === "frizzball") {
    return isBall(picked) && isBall(neighbor);
  }
  if (goesOff(picked) || goesOff(neighbor)) {
    return true;
  }
  if (bunchesAs(picked) === bunchesAs(neighbor)) {
    return false;
  }
  const swapped = swappedOn(board, from, to);
  return standsInBunch(swapped, from) || standsInBunch(swapped, to);
}

/**
 * Returns every move a board allows, a swap of two neighbors that can be
 * picked up, each once: by its first square, row by row, then with the
 * neighbor right of it before the one below.
 */
export function legalMoves(
  board: Board,
  rules: Readonly<Record<ElementId, ElementRule>>,
): readonly Pick<Swap, "from" | "to">[] {
  const free = board.pieces.map((_, square) => canSwap(board, square, rules));
  return free.flatMap((canPick, from) =>
    canPick
      ? neighborsOf(from, board)
          .filter(
            (to) => to > from && itemAt(free, to) && swapWorks(board, from, to),
          )
          .map((to) => ({ from, to }))
      : [],
  );
}

/**
 * Returns where the fuzzballs stand that could bunch with the one picked
 * up from a square: each that a move swapping it with a neighbor would
 * bunch it with, that neighbor among them where the swap bunches it. Its
 * squares, and theirs, are the screen's, in the order of their indices;
 * none for a square whose piece can't be picked up.
 */
export function bunchMatesOf(
  game: Pick<Game, "board" | "turns">,
  square: number,
  rules: Readonly<Record<ElementId, ElementRule>>,
): readonly number[] {
  const { board } = game;
  const from = fromScreen(game, square);
  if (!canSwap(board, from, rules)) {
    return [];
  }
  const mates = neighborsOf(from, board)
    .filter((to) => canSwap(board, to, rules) && swapWorks(board, from, to))
    .flatMap((to) =>
      findBunches(swappedOn(board, from, to), { from, to })
        .flatMap(({ squares }) => squares)
        .filter((bunched) => bunched !== to)
        .map((bunched) => (bunched === from ? to : bunched)),
    );
  return [...new Set(mates)]
    .map((mate) => onScreen(game, mate))
    .sort((a, b) => a - b);
}

/** Returns whether a piece goes off when it is swapped: a special fuzzball or the frizzball. */
function goesOff(piece: Piece | null): boolean {
  return (
    piece?.what === "frizzball" ||
    (piece?.what === "fuzzball" && piece.special !== null)
  );
}

/** Returns whether a piece is a fuzzball or the frizzball. */
function isBall(piece: Piece | null): boolean {
  return piece?.what === "fuzzball" || piece?.what === "frizzball";
}

/** Returns a board with the pieces on two of its squares traded. */
export function swappedOn(board: Board, from: number, to: number): Board {
  const pieces = [...board.pieces];
  pieces[from] = itemAt(board.pieces, to);
  pieces[to] = itemAt(board.pieces, from);
  return { ...board, pieces };
}
