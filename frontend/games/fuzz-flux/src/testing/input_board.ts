// A small board for the input's specs, as the screen shows it, a game on
// it that answers the picking as its picture says, and the board as a move
// played by hand, for the specs that run the scene on it:
//
//   A B C ·      · a gap
//   D # E F      # a brick, which can't be swapped
//   S G H I      S a special

import type { Square } from "../rules/board/cells";
import { type BoardShape, sameSquare } from "../view/board/spaces";
import type { GameInPlay } from "../view/input/picking";
import type { MoveFixture } from "./move_fixtures";

export const A: Square = { x: 0, y: 0 };
export const B: Square = { x: 1, y: 0 };
export const C: Square = { x: 2, y: 0 };
export const GAP: Square = { x: 3, y: 0 };
export const D: Square = { x: 0, y: 1 };
export const BRICK: Square = { x: 1, y: 1 };
export const E: Square = { x: 2, y: 1 };
export const F: Square = { x: 3, y: 1 };
export const SPECIAL: Square = { x: 0, y: 2 };
export const G: Square = { x: 1, y: 2 };
export const H: Square = { x: 2, y: 2 };

/** The board, 4 squares across and 3 down, its top right corner a gap. */
export const BOARD: BoardShape = {
  width: 4,
  height: 3,
  open: [true, true, true, false, ...Array<boolean>(8).fill(true)],
};

/** The fuzzballs that could bunch with B, were it swapped. */
export const B_MATES: readonly Square[] = [D, SPECIAL];

/** A game on {@link BOARD}, in which a move plays while a spec says so. */
export class GameOnBoard implements GameInPlay {
  /** Whether a move plays. */
  playing = false;

  readonly canSwap = (square: Square): boolean => !sameSquare(square, BRICK);
  readonly goesOff = (square: Square): boolean => sameSquare(square, SPECIAL);
  readonly bunchMatesOf = (square: Square): readonly Square[] =>
    sameSquare(square, B) ? B_MATES : [];
  readonly movePlays = (): boolean => this.playing;
}

/**
 * The board drawn as a move played by hand, a swap on it refused: B, D and
 * S blue, S a dasher across, and no three of a kind in a line.
 */
export const BOARD_FIXTURE: MoveFixture = {
  picture: {
    pieces: ["rbg_", "b1av", "bprg"],
    marks: ["....", "....", "-..."],
  },
  options: {},
  record: {
    swap: { from: 0, to: 1, refused: true },
    waves: [],
    burrSpread: null,
    gust: null,
    shuffle: null,
    outcome: "playing",
  },
};
