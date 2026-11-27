// The board coming to rest. Each piece no element holds falls straight
// down its column of the board's frame, past any gap, and a lane lets a
// fuzzball in at its top for each square nothing falls into. Where a piece
// held still stands over an empty square, the fuzzball diagonally above it
// rolls in, one at a time, and the board falls again.

import { itemAt } from "@fz/core/records";
import type { Game } from "../board/board";
import {
  columnsOf,
  indexOf,
  isOnBoard,
  rowsOf,
  squareOf,
} from "../board/cells";
import { ELEMENT_IDS, type ElementId } from "../catalog/elements";
import type { Piece } from "../catalog/pieces";
import type { ElementRule } from "../elements/element_rule";
import type { Fall } from "./record";
import { refillKind } from "./refill";

/** Describes a board come to rest, and how each piece got there. */
export interface Settled {
  /** The game as it rests: its board, its frame's lanes and the id its next piece takes. */
  readonly game: Game;
  /** Each piece's way down, in the board's own frame, in the order each first moved. */
  readonly falls: readonly Fall[];
}

/** Describes a piece on its square. */
interface Standing {
  readonly square: number;
  readonly piece: Piece;
}

/** Describes a piece's way down so far. */
interface Falling {
  readonly start: Omit<Fall, "path">;
  readonly path: number[];
}

/**
 * Returns a game with its board come to rest: every piece no element's
 * rule holds fallen as far as it can, each fuzzball that can roll in under
 * a piece held rolled in, and each square nothing falls into filled from
 * its lane.
 *
 * Straight falls go a column at a time from the left, each from its
 * bottom. A roll takes the lowest empty square it can, the leftmost of a
 * row, and on every other square, by the moves played, looks above to the
 * right before the left.
 */
export function settle(
  game: Game,
  rules: Readonly<Record<ElementId, ElementRule>>,
): Settled {
  const settling = new Settling(game, rules);
  let moving = true;
  while (moving) {
    moving = settling.fallStraight() || settling.rollOne();
  }
  return settling.settled();
}

/** Holds a board as it settles, moving each of its pieces in turn. */
class Settling {
  private readonly pieces: (Piece | null)[];
  private readonly letIn: number[];
  private nextPieceId: number;
  private readonly falling: Falling[] = [];
  /** Where each square's piece is in `falling`, once it has moved. */
  private readonly fallingAt: (number | null)[];

  constructor(
    private readonly game: Game,
    private readonly rules: Readonly<Record<ElementId, ElementRule>>,
  ) {
    this.pieces = [...game.board.pieces];
    this.letIn = [...game.lanes[game.turns]];
    this.nextPieceId = game.nextPieceId;
    this.fallingAt = this.pieces.map(() => null);
  }

  /** Lets every piece fall straight down that can, and every lane let in what fills it, and returns whether any did. */
  fallStraight(): boolean {
    let moved = false;
    for (const [lane, column] of columnsOf(this.game.board).entries()) {
      for (let row = column.length - 1; row >= 0; row--) {
        const square = itemAt(column, row);
        if (!this.isEmpty(square)) {
          continue;
        }
        const above = this.pieceAbove(column, row);
        if (above === null) {
          this.letInAt(square, lane);
          moved = true;
        } else if (!this.holdsFall(above.square)) {
          this.move(above, square, lane);
          moved = true;
        }
      }
    }
    return moved;
  }

  /** Rolls one fuzzball in under a piece held, and returns whether one rolled. */
  rollOne(): boolean {
    const { board, movesPlayed } = this.game;
    for (const row of rowsOf(board).slice(1).reverse()) {
      for (const square of row) {
        if (!this.isEmpty(square)) {
          continue;
        }
        const { x, y } = squareOf(square, board.width);
        const sides = (x + y + movesPlayed) % 2 === 0 ? [-1, 1] : [1, -1];
        for (const side of sides) {
          const above = { x: x + side, y: y - 1 };
          if (!isOnBoard(above, board)) {
            continue;
          }
          const from = indexOf(above, board.width);
          const piece = itemAt(this.pieces, from);
          if (piece !== null && !this.holdsFall(from)) {
            this.move({ square: from, piece }, square, x);
            return true;
          }
        }
      }
    }
    return false;
  }

  /** Returns the game as the board rests, and each piece's way down. */
  settled(): Settled {
    const { game } = this;
    const lanes = [...game.lanes] satisfies Game["lanes"];
    lanes[game.turns] = this.letIn;
    return {
      game: {
        ...game,
        board: { ...game.board, pieces: this.pieces },
        lanes,
        nextPieceId: this.nextPieceId,
      },
      falls: this.falling.map(({ start, path }) => ({ ...start, path })),
    };
  }

  /** Returns whether a square is open and holds nothing. */
  private isEmpty(square: number): boolean {
    return (
      itemAt(this.game.board.open, square) &&
      itemAt(this.pieces, square) === null
    );
  }

  /** Returns the nearest piece above a square of a column, past gaps and empty squares, or null for none. */
  private pieceAbove(column: readonly number[], row: number): Standing | null {
    for (let above = row - 1; above >= 0; above--) {
      const square = itemAt(column, above);
      const piece = itemAt(this.pieces, square);
      if (piece !== null) {
        return { square, piece };
      }
    }
    return null;
  }

  /** Returns whether an element's rule keeps a square's piece where it is. */
  private holdsFall(square: number): boolean {
    const state = {
      piece: itemAt(this.pieces, square),
      dust: itemAt(this.game.board.dust, square),
    };
    return ELEMENT_IDS.some((id) => this.rules[id].holdsFall?.(state) === true);
  }

  /** Moves a piece to a square, adding the square to its way down, which starts in the lane given. */
  private move(
    { square: from, piece }: Standing,
    to: number,
    lane: number,
  ): void {
    let at = itemAt(this.fallingAt, from);
    if (at === null) {
      at = this.falling.length;
      this.falling.push({ start: startOf(piece, from, lane), path: [] });
    }
    itemAt(this.falling, at).path.push(to);
    this.pieces[to] = piece;
    this.pieces[from] = null;
    this.fallingAt[to] = at;
    this.fallingAt[from] = null;
  }

  /** Lets a fuzzball in at the top of a lane, onto a square. */
  private letInAt(square: number, lane: number): void {
    const letIn = itemAt(this.letIn, lane);
    const piece: Piece = {
      what: "fuzzball",
      id: this.nextPieceId,
      kind: refillKind(this.game, lane, letIn),
      special: null,
      caged: false,
      burred: false,
    };
    this.letIn[lane] = letIn + 1;
    this.nextPieceId++;
    this.pieces[square] = piece;
    this.fallingAt[square] = this.falling.length;
    this.falling.push({ start: startOf(piece, null, lane), path: [square] });
  }
}

/** Returns the start of a piece's way down: the piece, its kind where it is a fuzzball, where it fell from, and its lane. */
function startOf(
  piece: Piece,
  from: number | null,
  lane: number,
): Omit<Fall, "path"> {
  return {
    piece: piece.id,
    kind: piece.what === "fuzzball" ? piece.kind : null,
    from,
    lane,
  };
}
