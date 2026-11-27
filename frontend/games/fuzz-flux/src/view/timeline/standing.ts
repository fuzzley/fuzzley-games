// A piece where it stands on the board as the screen shows it, as an event
// finds the pieces it moves.

import { squareOf } from "../../rules/board/cells";
import type { Piece } from "../../rules/catalog/pieces";
import type { GridShown } from "../run_state";
import type { Place } from "./timeline";

/** Describes a piece where it stands. */
export interface Standing {
  readonly piece: Piece;
  readonly at: Place;
}

/** Returns the piece standing on a square of a board, or null for a square with none or a gap. */
export function findStanding(grid: GridShown, square: number): Standing | null {
  const piece = grid.squares[square]?.piece ?? null;
  return piece === null ? null : { piece, at: squareOf(square, grid.width) };
}

/**
 * Returns the piece standing on a square of a board, which must hold one.
 *
 * @throws {RangeError} for a square with no piece.
 */
export function standingOn(grid: GridShown, square: number): Standing {
  const standing = findStanding(grid, square);
  if (standing === null) {
    throw new RangeError(`No piece stands on square ${String(square)}.`);
  }
  return standing;
}

/** Returns every piece standing on a board, in the order of its squares. */
export function everyStanding(grid: GridShown): readonly Standing[] {
  return grid.squares.flatMap((_, square) => {
    const standing = findStanding(grid, square);
    return standing === null ? [] : [standing];
  });
}
