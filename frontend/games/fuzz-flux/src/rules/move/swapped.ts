// What a move's swap does before its first wave. A special tapped goes
// off where it stands, the frizzball with the kind the board holds most
// of. Two specials, or the frizzball and another, swapped together go off
// as their pair on the square the one picked up was swapped to; the
// frizzball swapped with a fuzzball goes off where it lands, with that
// one's kind; and any other swap trades the two, the special among them,
// if one is, going off where it lands unless it lands in a bunch. What
// goes off is taken off the board, a fuzzball counted as gathered.

import { itemAt } from "@fz/core/records";
import type { Game } from "../board/board";
import { neighborsOf } from "../board/cells";
import { commonestKind } from "../blasts/frizzball";
import { type Partner, pairOf } from "../blasts/pairs";
import type { SetOff } from "../blasts/striking";
import { type FoundBunch, findBunches } from "../bunches/find";
import type { ElementId } from "../catalog/elements";
import type { KindId } from "../catalog/kinds";
import type { Piece } from "../catalog/pieces";
import type { ElementRule } from "../elements/element_rule";
import { countedOff } from "./goals";
import { canSwap, swapWorks, swappedOn } from "./swap";

/** Describes what a move's swap did, before its first wave. */
export interface Swapped {
  /**
   * The game as the swap left it, what it set off taken off the board and
   * counted, its moves played not yet counting the move.
   */
  readonly game: Game;
  /**
   * The bunches the swap stood up, in the order found: none for a tap, a
   * pair, or the frizzball swapped with a fuzzball.
   */
  readonly bunches: readonly FoundBunch[];
  /** What the swap set off, in the order it goes off. */
  readonly setOff: readonly SetOff[];
}

/**
 * Returns what swapping the piece picked up on a square with its neighbor
 * on another does, or tapping it where it stands, the two squares one, or
 * null for a move refused.
 *
 * A move is refused that swaps squares that aren't neighbors, or a piece
 * that can't be picked up, or that `swapWorks()` says makes no move; or
 * that taps a piece that doesn't go off. Both squares are on the board:
 * one off it throws, as `itemAt()` does.
 */
export function playSwap(
  game: Game,
  from: number,
  to: number,
  rules: Readonly<Record<ElementId, ElementRule>>,
): Swapped | null {
  const { board } = game;
  const picked = itemAt(board.pieces, from);
  const neighbor = itemAt(board.pieces, to);
  if (
    picked === null ||
    neighbor === null ||
    !canSwap(board, from, rules) ||
    !canSwap(board, to, rules)
  ) {
    return null;
  }
  if (from === to) {
    return tapped(game, from, picked);
  }
  if (!neighborsOf(from, board).includes(to) || !swapWorks(board, from, to)) {
    return null;
  }
  const one = partnerOf(picked);
  const other = partnerOf(neighbor);
  if (one !== null && other !== null) {
    return {
      game: takenOff(game, [from, to]),
      bunches: [],
      setOff: [{ ...pairOf(one, other), square: to, piece: picked.id }],
    };
  }
  const traded = { ...game, board: swappedOn(board, from, to) };
  if (picked.what === "frizzball" && neighbor.what === "fuzzball") {
    return frizzballSwapped(traded, to, picked.id, neighbor.kind);
  }
  if (neighbor.what === "frizzball" && picked.what === "fuzzball") {
    return frizzballSwapped(traded, from, neighbor.id, picked.kind);
  }
  const bunches = findBunches(traded.board, { from, to });
  const goingOff = [
    { piece: picked, square: to },
    { piece: neighbor, square: from },
  ].flatMap(({ piece, square }) =>
    piece.what === "fuzzball" &&
    piece.special !== null &&
    !bunches.some((bunch) => bunch.squares.includes(square))
      ? [{ what: piece.special, square, piece: piece.id, kind: piece.kind }]
      : [],
  );
  return {
    game: takenOff(
      traded,
      goingOff.map(({ square }) => square),
    ),
    bunches,
    setOff: goingOff,
  };
}

/** Returns what tapping a piece where it stands does: a special or the frizzball goes off there, and any other is refused. */
function tapped(game: Game, square: number, piece: Piece): Swapped | null {
  const partner = partnerOf(piece);
  if (partner === null) {
    return null;
  }
  const left = takenOff(game, [square]);
  return {
    game: left,
    bunches: [],
    setOff: [
      {
        what: partner.made,
        square,
        piece: piece.id,
        kind: partner.kind ?? commonestKind(left.board, game.kinds),
      },
    ],
  };
}

/** Returns what swapping the frizzball with a fuzzball does, on the board traded: the frizzball goes off where it landed, with the fuzzball's kind. */
function frizzballSwapped(
  traded: Game,
  landed: number,
  frizzball: number,
  kind: KindId,
): Swapped {
  return {
    game: takenOff(traded, [landed]),
    bunches: [],
    setOff: [{ what: "frizzball", square: landed, piece: frizzball, kind }],
  };
}

/** Returns a piece that goes off when swapped as a pair's partner: a special, with its fuzzball's kind, or the frizzball; null for any other. */
function partnerOf(piece: Piece): Partner | null {
  if (piece.what === "frizzball") {
    return { made: "frizzball", kind: null };
  }
  return piece.what === "fuzzball" && piece.special !== null
    ? { made: piece.special, kind: piece.kind }
    : null;
}

/** Returns a game with the pieces on some squares taken off its board, each fuzzball among them counted as gathered. */
function takenOff(game: Game, squares: readonly number[]): Game {
  const pieces = [...game.board.pieces];
  let goalsLeft = game.goalsLeft;
  for (const square of squares) {
    const piece = itemAt(pieces, square);
    if (piece?.what === "fuzzball") {
      goalsLeft = countedOff(
        { goals: game.goals, goalsLeft },
        { what: "gather", kind: piece.kind },
      );
    }
    pieces[square] = null;
  }
  return { ...game, board: { ...game.board, pieces }, goalsLeft };
}
