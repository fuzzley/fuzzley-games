// A board as the shell shows it, for a spec of the view to play a move
// from: its squares in the screen's frame, as a picture's board is when
// its frame is not turned, and how a move played by hand starts on it.

import type { Board } from "../rules/board/board";
import type { GridShown } from "../view/run_state";
import type { MoveStart } from "../view/timeline/build";
import { gameFrom } from "./board_picture";
import type { MoveFixture } from "./move_fixtures";

/** Returns how the grid over a board names its squares, the board's frame the screen's. */
export function gridOf(board: Board): GridShown {
  return {
    width: board.width,
    height: board.height,
    squares: board.pieces.map((piece, square) =>
      board.open[square] === true
        ? { piece, dust: board.dust[square] ?? 0 }
        : null,
    ),
  };
}

/** Returns how a move played by hand starts: on its game's board, as yet unturned, the wind blowing down, with no fuzzball picked up. */
export function moveStartOf({ picture, options }: MoveFixture): MoveStart {
  return {
    grid: gridOf(gameFrom(picture, options).board),
    wind: null,
    held: null,
  };
}
