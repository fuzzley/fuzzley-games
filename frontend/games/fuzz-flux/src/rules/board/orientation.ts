// The board's own frame and the screen's. The rules let everything fall down
// the board's own frame, so a wind that blows another way turns the frame
// instead, and what the rules hand out is mapped back to the screen's frame,
// as what comes in is mapped from it. Each frame has lanes of its own, a
// lane a column of it, which count the fuzzballs let in there.

import { isKeyOf, itemAt } from "@fz/core/records";
import type { Piece } from "../catalog/pieces";
import type { Board, Game, Lanes, QuarterTurns } from "./board";
import { type BoardSize, indexOf, squareOf } from "./cells";

/** Every count of quarter turns a frame can be turned from the screen's, each at its place. */
const QUARTER_TURNS = [0, 1, 2, 3] as const satisfies readonly QuarterTurns[];

/** The way each dasher runs once its board's frame has turned a quarter, which on the screen is the way it ran. */
const DASHERS_TURNED = {
  "dasher-across": "dasher-down",
  "dasher-down": "dasher-across",
} as const;

/**
 * Returns a game with its board's frame turned so many quarter turns
 * clockwise, as a wind turned as many counterclockwise turns it, each
 * dasher running on the screen as it did.
 */
export function turnFrame(game: Game, quarters: number): Game {
  const turns = itemAt(QUARTER_TURNS, ((quarters % 4) + 4) % 4);
  let board = game.board;
  for (let turn = 0; turn < turns; turn++) {
    board = quarterTurned(board);
  }
  return {
    ...game,
    board,
    turns: itemAt(QUARTER_TURNS, (game.turns + turns) % 4),
  };
}

/** Returns where a square of a game's board, in the board's own frame, is on the screen, by its index there. */
export function onScreen(
  { board, turns }: Pick<Game, "board" | "turns">,
  square: number,
): number {
  return squareTurned(square, board, (4 - turns) % 4);
}

/** Returns the square of a game's board, in the board's own frame, that a square of the screen shows. */
export function fromScreen(
  { board, turns }: Pick<Game, "board" | "turns">,
  square: number,
): number {
  const upright = turns % 2 === 0;
  const screen = {
    width: upright ? board.width : board.height,
    height: upright ? board.height : board.width,
  };
  return squareTurned(square, screen, turns);
}

/**
 * Returns the lanes of a game whose board is dealt in the screen's frame,
 * none of them having let a fuzzball in yet: each frame's as many as the
 * board is wide in it.
 */
export function freshLanes({ width, height }: BoardSize): Lanes {
  const lanes = (count: number): number[] => Array<number>(count).fill(0);
  return [lanes(width), lanes(height), lanes(width), lanes(height)];
}

/** Returns a board turned a quarter turn clockwise. */
function quarterTurned(board: Board): Board {
  const { width, height } = board;
  const after = { width: height, height: width };
  // Each square of the board turned, by where it was before the turn.
  const before = Array.from({ length: width * height }, (_, square) =>
    squareTurned(square, after, 3),
  );
  const take = <T>(list: readonly T[]): T[] =>
    before.map((square) => itemAt(list, square));
  return {
    ...after,
    open: take(board.open),
    pieces: take(board.pieces).map(dasherTurned),
    dust: take(board.dust),
    beds: take(board.beds),
  };
}

/** Returns a piece as its board's frame turned a quarter leaves it: a dasher running the other way in it, and any other piece the same. */
function dasherTurned(piece: Piece | null): Piece | null {
  return piece?.what === "fuzzball" && isKeyOf(piece.special, DASHERS_TURNED)
    ? { ...piece, special: DASHERS_TURNED[piece.special] }
    : piece;
}

/** Returns where a square of a board of a size lands once the board is turned so many quarter turns clockwise. */
function squareTurned(
  square: number,
  { width, height }: BoardSize,
  quarters: number,
): number {
  let { x, y } = squareOf(square, width);
  let [across, down] = [width, height];
  for (let turn = 0; turn < quarters; turn++) {
    [x, y] = [down - 1 - y, x];
    [across, down] = [down, across];
  }
  return indexOf({ x, y }, across);
}
