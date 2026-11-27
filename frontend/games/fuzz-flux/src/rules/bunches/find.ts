// The bunches standing on a board: 3 or more fuzzballs of a kind in a line
// across or down, or 4 in a square, and any of those that touch, taken as
// one. A fuzzball bunches by its kind alone, special, caged or burred; no
// other piece bunches.

import { itemAt } from "@fz/core/records";
import type { Board } from "../board/board";
import {
  type Square,
  columnsOf,
  indexOf,
  isOnBoard,
  rowsOf,
  squareOf,
} from "../board/cells";
import type { KindId } from "../catalog/kinds";
import type { Piece } from "../catalog/pieces";
import type { Making, Swap } from "../move/record";
import { type BunchShape, makingOf } from "./makes";

/** Describes a bunch standing on a board, and what it leaves behind. */
export interface FoundBunch {
  /** Its squares, in the order of their indices. */
  readonly squares: readonly number[];
  readonly kind: KindId;
  /** What it leaves behind and where, or null for a bunch that leaves nothing. */
  readonly makes: Omit<Making, "piece"> | null;
}

/** Describes a line of 3 or more, or a square of 4, of one kind. */
interface Run {
  readonly kind: KindId;
  readonly squares: readonly number[];
}

/** Describes a line or a square of 4 that a bunch is made of, and which it is. */
interface Part extends Run {
  readonly shape: "across" | "down" | "squaresOfFour";
}

/** The fewest fuzzballs of a kind in a line that bunch. */
const SHORTEST_LINE = 3;

/** The steps from a square to the far corner of each square of 4 it could be a corner of. */
const CORNERS: readonly Square[] = [
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: 1, y: 1 },
];

/**
 * Returns every bunch standing on a board, in the order the board is read:
 * each by the first of its lines across, row by row, then of its lines
 * down, column by column, then of its squares of 4, row by row.
 *
 * @param swap The swap the board was just played, its fuzzballs already
 *   traded, or null for a board a fall left.
 */
export function findBunches(
  board: Board,
  swap: Pick<Swap, "from" | "to"> | null,
): readonly FoundBunch[] {
  const kinds = board.pieces.map(bunchesAs);
  const parts: Part[] = [
    ...rowsOf(board)
      .flatMap((row) => linesAlong(row, kinds))
      .map((run) => ({ ...run, shape: "across" as const })),
    ...columnsOf(board)
      .flatMap((column) => linesAlong(column, kinds))
      .map((run) => ({ ...run, shape: "down" as const })),
    ...squaresOfFour(board, kinds).map((run) => ({
      ...run,
      shape: "squaresOfFour" as const,
    })),
  ];
  if (parts.length === 0) {
    return [];
  }
  return bunchesOf(parts, kinds.length).map((bunch) => {
    const shape = shapeOf(bunch);
    return {
      squares: shape.squares,
      kind: itemAt(bunch, 0).kind,
      makes: makingOf(shape, swap),
    };
  });
}

/** Returns whether the fuzzball on a square stands in a bunch, in a line of 3 or more of its kind or a square of 4. */
export function standsInBunch(board: Board, square: number): boolean {
  const kind = bunchesAs(itemAt(board.pieces, square));
  if (kind === null) {
    return false;
  }
  const at = squareOf(square, board.width);
  const isKind = (x: number, y: number): boolean =>
    isOnBoard({ x, y }, board) &&
    bunchesAs(itemAt(board.pieces, indexOf({ x, y }, board.width))) === kind;
  const run = (dx: number, dy: number): number => {
    let length = 0;
    while (isKind(at.x + dx * (length + 1), at.y + dy * (length + 1))) {
      length++;
    }
    return length;
  };
  return (
    1 + run(-1, 0) + run(1, 0) >= SHORTEST_LINE ||
    1 + run(0, -1) + run(0, 1) >= SHORTEST_LINE ||
    CORNERS.some(
      ({ x, y }) =>
        isKind(at.x + x, at.y) &&
        isKind(at.x, at.y + y) &&
        isKind(at.x + x, at.y + y),
    )
  );
}

/** Returns the kind a piece bunches as: a fuzzball's own, or null for any other piece, or none. */
export function bunchesAs(piece: Piece | null): KindId | null {
  return piece?.what === "fuzzball" ? piece.kind : null;
}

/** Returns the lines of 3 or more of a kind along a row or a column, each in its order. */
function linesAlong(
  line: readonly number[],
  kinds: readonly (KindId | null)[],
): Run[] {
  const runs: Run[] = [];
  let start = 0;
  while (start < line.length) {
    const kind = itemAt(kinds, itemAt(line, start));
    let end = start + 1;
    while (
      kind !== null &&
      end < line.length &&
      itemAt(kinds, itemAt(line, end)) === kind
    ) {
      end++;
    }
    if (kind !== null && end - start >= SHORTEST_LINE) {
      runs.push({ kind, squares: line.slice(start, end) });
    }
    start = end;
  }
  return runs;
}

/** Returns the squares of 4 of a kind on a board, row by row, each its top left, top right, bottom left and bottom right. */
function squaresOfFour(board: Board, kinds: readonly (KindId | null)[]): Run[] {
  const { width } = board;
  return rowsOf(board)
    .slice(0, -1)
    .flatMap((row) => row.slice(0, -1))
    .flatMap((corner) => {
      const kind = itemAt(kinds, corner);
      const squares = [corner, corner + 1, corner + width, corner + width + 1];
      return kind !== null &&
        squares.every((square) => itemAt(kinds, square) === kind)
        ? [{ kind, squares }]
        : [];
    });
}

/**
 * Returns the parts that share a square gathered into bunches, each in the
 * order of its first part, and each bunch's parts in their order.
 */
function bunchesOf(parts: readonly Part[], size: number): (readonly Part[])[] {
  // Each square's link toward the square that stands for its bunch.
  const joined = Array.from({ length: size }, (_, square) => square);
  const rootOf = (square: number): number => {
    let root = square;
    while (itemAt(joined, root) !== root) {
      root = itemAt(joined, root);
    }
    return root;
  };
  for (const { squares } of parts) {
    for (const square of squares) {
      joined[rootOf(square)] = rootOf(itemAt(squares, 0));
    }
  }
  // Each bunch by its root, made at its first part, so the bunches come in
  // their first parts' order.
  const bunchAt = Array.from({ length: size }, (): Part[] | null => null);
  const bunches: Part[][] = [];
  for (const part of parts) {
    const root = rootOf(itemAt(part.squares, 0));
    let bunch = itemAt(bunchAt, root);
    if (bunch === null) {
      bunch = [];
      bunchAt[root] = bunch;
      bunches.push(bunch);
    }
    bunch.push(part);
  }
  return bunches;
}

/** Returns what a bunch is made of, from its parts. */
function shapeOf(parts: readonly Part[]): BunchShape {
  const of = (shape: Part["shape"]): (readonly number[])[] =>
    parts.filter((part) => part.shape === shape).map(({ squares }) => squares);
  return {
    squares: [...new Set(parts.flatMap(({ squares }) => squares))].sort(
      (a, b) => a - b,
    ),
    across: of("across"),
    down: of("down"),
    squaresOfFour: of("squaresOfFour"),
  };
}
