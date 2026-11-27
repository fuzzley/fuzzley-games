// The frizzball going off: it strikes every fuzzball of the kind it
// takes, nearest first, a step each in turn. Swapped with a fuzzball it
// takes that one's kind; tapped, or set off by a blast, the kind the board
// holds most of.

import { itemAt } from "@fz/core/records";
import type { Board } from "../board/board";
import type { KindId } from "../catalog/kinds";
import type { Strike } from "../move/record";
import { wholeBoardStrikes } from "./strikes";

/**
 * Returns the kind a frizzball set off takes where nothing gives it one:
 * the kind in play the board holds the most fuzzballs of, special, caged
 * or burred, the first in play of those it holds as many of.
 */
export function commonestKind(
  board: Pick<Board, "pieces">,
  kinds: readonly KindId[],
): KindId {
  const counts = kinds.map(
    (kind) =>
      board.pieces.filter(
        (piece) => piece?.what === "fuzzball" && piece.kind === kind,
      ).length,
  );
  let commonest = 0;
  for (const [place, count] of counts.entries()) {
    if (count > itemAt(counts, commonest)) {
      commonest = place;
    }
  }
  return itemAt(kinds, commonest);
}

/**
 * Returns the squares a frizzball going off on a square strikes: each
 * fuzzball of the kind it took, special or not, nearest first and then by
 * index, its step its place in that order from 1.
 */
export function frizzballStrikes(
  board: Pick<Board, "width" | "open" | "pieces">,
  square: number,
  kind: KindId,
): readonly Strike[] {
  return wholeBoardStrikes(board, square)
    .filter((strike) => {
      const piece = itemAt(board.pieces, strike.square);
      return piece?.what === "fuzzball" && piece.kind === kind;
    })
    .map((strike, place) => ({ square: strike.square, step: place + 1 }));
}
