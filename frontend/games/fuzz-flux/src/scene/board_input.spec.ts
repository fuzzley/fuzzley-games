import { Core } from "phaser";
import type { Square } from "../rules/board/cells";
import { A, B, BOARD_FIXTURE, B_MATES, SPECIAL } from "../testing/input_board";
import {
  type Board,
  drawnPlay,
  layoutOf,
  playTo,
  startBoard,
} from "../testing/scene_shell";
import { FEEL } from "../view/timeline/feel";

/** Returns where a square's middle lies on the canvas the board was laid out on, in its pixels. */
function middleOf(board: Board, { x, y }: Square): { x: number; y: number } {
  const metrics = layoutOf(board);
  return {
    x: metrics.x + (x + 0.5) * metrics.square,
    y: metrics.y + (y + 0.5) * metrics.square,
  };
}

/** Presses the mouse's main button on a square's middle, and lets go there. */
function click(board: Board, square: Square): void {
  const at = middleOf(board, square);
  board.run.pointer("down", at.x, at.y);
  board.run.pointer("up", at.x, at.y);
}

/** Returns how far a press runs before it swipes, in the canvas's pixels, and a pixel more. */
function pastSwipe(board: Board): number {
  return FEEL.swipeSquares * layoutOf(board).square + 1;
}

/** Runs the scene on a board, with the special picked up. */
async function holdingSpecial(): Promise<Board> {
  const board = await startBoard(BOARD_FIXTURE);
  click(board, SPECIAL);
  return board;
}

/** A level's end a tap may hurry from 100 ms in. */
const ENDING = drawnPlay({
  restMs: 400,
  end: { cardMs: 500, starsMs: [600], hurriedFromMs: 100 },
});

/** Returns how far the play moved on in the last frame, as the scene told the shell. */
function lastFrameMs({ shell }: Board): number {
  const [before, last] = shell.ticks.slice(-2);
  return (last?.playedMs ?? 0) - (before?.playedMs ?? 0);
}

describe("BoardInput", () => {
  it("picks up the fuzzball a press starts on, those that could bunch with it looking its way", async () => {
    const board = await startBoard(BOARD_FIXTURE);
    const at = middleOf(board, B);

    board.run.pointer("down", at.x, at.y);

    expect(board.shell.commands).toEqual([
      { what: "pick-up", square: B, mates: B_MATES },
    ]);
  });

  it("swaps the fuzzball pressed the way the press swipes", async () => {
    const board = await startBoard(BOARD_FIXTURE);
    const at = middleOf(board, A);

    board.run.pointer("down", at.x, at.y);
    board.run.pointer("move", at.x + pastSwipe(board), at.y);

    expect(board.shell.commands.at(-1)).toEqual({
      what: "swap",
      from: A,
      to: B,
    });
  });

  it("swaps the fuzzball pressed the way a press swipes as it ends, short of swiping before", async () => {
    const board = await startBoard(BOARD_FIXTURE);
    const at = middleOf(board, A);

    board.run.pointer("down", at.x, at.y);
    board.run.pointer("up", at.x + pastSwipe(board), at.y);

    expect(board.shell.commands.at(-1)).toEqual({
      what: "swap",
      from: A,
      to: B,
    });
  });

  it("sets off the special held at a tap on it", async () => {
    const board = await holdingSpecial();

    click(board, SPECIAL);

    expect(board.shell.commands.at(-1)).toEqual({
      what: "set-off",
      square: SPECIAL,
    });
  });

  it("ends a press let go off the canvas", async () => {
    const board = await holdingSpecial();
    const at = middleOf(board, SPECIAL);

    board.run.pointer("down", at.x, at.y);
    board.run.pointer("up", at.x, at.y, { on: document.body });

    expect(board.shell.commands.at(-1)).toEqual({
      what: "set-off",
      square: SPECIAL,
    });
  });

  it("plays a finger's tap as the mouse's", async () => {
    const board = await holdingSpecial();
    const at = middleOf(board, SPECIAL);

    board.run.touch("start", at.x, at.y);
    board.run.touch("end", at.x, at.y);

    expect(board.shell.commands.at(-1)).toEqual({
      what: "set-off",
      square: SPECIAL,
    });
  });

  it("reads a press the browser takes away as nothing", async () => {
    const board = await holdingSpecial();
    const at = middleOf(board, SPECIAL);
    const handed = board.shell.commands.length;

    board.run.touch("start", at.x, at.y);
    board.run.touch("cancel", at.x, at.y);

    expect(board.shell.commands.slice(handed)).toEqual([]);
  });

  it("forgets the press under way as the player looks away", async () => {
    const board = await holdingSpecial();
    const at = middleOf(board, SPECIAL);
    const handed = board.shell.commands.length;

    board.run.pointer("down", at.x, at.y);
    board.run.game.events.emit(Core.Events.BLUR);
    board.run.pointer("up", at.x, at.y);

    expect(board.shell.commands.slice(handed)).toEqual([]);
  });

  it("takes no press of a mouse's button but its main one", async () => {
    const board = await startBoard(BOARD_FIXTURE);
    const at = middleOf(board, A);

    board.run.pointer("down", at.x, at.y, { button: 2 });

    expect(board.shell.commands).toEqual([]);
  });

  it("plays each key the board answers on the ring", async () => {
    const board = await startBoard(BOARD_FIXTURE);

    board.run.key("keydown", "ArrowRight");

    expect(board.shell.commands).toEqual([{ what: "move-ring", square: B }]);
  });

  it("hurries the clock at a press as a level's end lets a tap hurry it", async () => {
    const board = await startBoard(BOARD_FIXTURE);
    playTo(board, ENDING, 160);
    const at = middleOf(board, A);

    board.run.pointer("down", at.x, at.y);
    board.run.advance(16);

    expect(lastFrameMs(board)).toBe(16 * FEEL.hurriedPace);
  });

  it("hurries the clock at a key the board answers", async () => {
    const board = await startBoard(BOARD_FIXTURE);
    playTo(board, ENDING, 160);

    board.run.key("keydown", "Space", " ");
    board.run.advance(16);

    expect(lastFrameMs(board)).toBe(16 * FEEL.hurriedPace);
  });

  it("hurries nothing at a held key's repeat", async () => {
    const board = await startBoard(BOARD_FIXTURE);
    playTo(board, ENDING, 160);

    board.run.key("keydown", "Space", " ", { repeat: true });
    board.run.advance(16);

    expect(lastFrameMs(board)).toBe(16);
  });

  it("hurries nothing at a key it leaves to the page", async () => {
    const board = await startBoard(BOARD_FIXTURE);
    playTo(board, ENDING, 160);

    board.run.key("keydown", "KeyQ", "q");
    board.run.advance(16);

    expect(lastFrameMs(board)).toBe(16);
  });
});
