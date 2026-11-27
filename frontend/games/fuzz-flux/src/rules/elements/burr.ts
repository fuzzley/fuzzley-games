// Burrs: a burr a plain fuzzball wears, which keeps it from being swapped,
// and so out of a shuffle and the encore's choosing. A bunch that takes its
// fuzzball in brushes it off, and so does a bunch beside it or a blast,
// each counted as a burr brushed off; it falls off uncounted where a
// frizzball gives its fuzzball a special's fur. After a move that brushed
// none off, a burr spreads to a plain fuzzball beside a burred one. A wisp
// seeks a burr out whatever the goals, as no goal counts burrs.

import { hashOf } from "@fz/core/random";
import { itemAt } from "@fz/core/records";
import { neighborsOf } from "../board/cells";
import type { Fuzzball, Piece } from "../catalog/pieces";
import { SALTS } from "../draws";
import { WISP_BURR_WORTH, WISP_RANKS } from "../tuning";
import type {
  Change,
  ElementRule,
  MoveEnd,
  Spread,
  SquareState,
} from "./element_rule";

/** Returns whether a piece is a fuzzball wearing a burr. */
function isBurred(
  piece: Piece | null,
): piece is Fuzzball & { readonly burred: true } {
  return piece?.what === "fuzzball" && piece.burred;
}

/** Returns whether a burr can spread to a piece: a plain fuzzball, neither special, caged nor burred. */
function takesBurr(piece: Piece | null): boolean {
  return (
    piece?.what === "fuzzball" &&
    piece.special === null &&
    !piece.caged &&
    !piece.burred
  );
}

/** Returns a burred fuzzball's square with its burr brushed off, which counts, with the hit given, or null for any other square. */
function brushedOff(
  { piece, dust }: SquareState,
  hit: "unburred" | null,
): Change | null {
  return isBurred(piece)
    ? {
        square: { piece: { ...piece, burred: false }, dust },
        hit,
        counts: true,
      }
    : null;
}

/**
 * Returns where a burr spreads as a move ends: nowhere after a move that
 * brushed one off, else one of the ways a burr can spread to a plain
 * fuzzball beside it, listed burr by burr in `neighborsOf()`'s order and
 * drawn from the deal's seed and the moves played; nowhere where there is
 * none.
 */
function spreadAt({ game, counted }: MoveEnd): Spread | null {
  if (counted > 0) {
    return null;
  }
  const { pieces } = game.board;
  const ways = pieces.flatMap((piece, from) =>
    isBurred(piece)
      ? neighborsOf(from, game.board)
          .filter((to) => takesBurr(itemAt(pieces, to)))
          .map((to) => ({ from, to }))
      : [],
  );
  if (ways.length === 0) {
    return null;
  }
  const draw = hashOf(game.seed, game.movesPlayed, ways.length, SALTS.burr);
  return itemAt(ways, draw % ways.length);
}

/** The burr's part in a move. */
export const BURR_RULE: ElementRule = {
  holdsSwap: ({ piece }) => isBurred(piece),
  inBunch: (square) => brushedOff(square, null),
  besideBunch: (square) => brushedOff(square, "unburred"),
  blasted: (square) => brushedOff(square, "unburred"),
  givenFur: (square) => brushedOff(square, null)?.square ?? square,
  moveEnded: spreadAt,
  wisp: {
    rank: WISP_RANKS.burr,
    worth: ({ pieces }, square) =>
      isBurred(itemAt(pieces, square)) ? WISP_BURR_WORTH : null,
  },
};
