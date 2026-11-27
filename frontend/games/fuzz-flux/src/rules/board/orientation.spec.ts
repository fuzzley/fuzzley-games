import { gameFrom, pictureOf } from "../../testing/board_picture";
import type { QuarterTurns } from "./board";
import { freshLanes, fromScreen, onScreen, turnFrame } from "./orientation";

/** A board 2 squares wide and 3 high, a kind a square but for a gap and a bed under a sleepyhead. */
const TALL = { pieces: ["bz", "r_", "ap"], dust: ["10", "20", "00"] };

/** Every count of quarter turns a frame can be turned. */
const TURNS: readonly QuarterTurns[] = [0, 1, 2, 3];

/** Returns the squares of a board so many squares wide and high, in order. */
function squaresOf(width: number, height: number): number[] {
  return Array.from({ length: width * height }, (_, square) => square);
}

describe("turnFrame", () => {
  it("turns the board's frame a quarter clockwise, its top row its right column", () => {
    const game = gameFrom(TALL);

    const { board } = turnFrame(game, 1);

    expect({ ...pictureOf(board), beds: board.beds }).toEqual({
      pieces: ["arb", "p_z"],
      dust: ["021", "000"],
      beds: [true, false, false, true, false, false],
    });
  });

  it("counts the turn in the game's quarter turns", () => {
    const game = turnFrame(gameFrom(TALL), 3);

    expect(turnFrame(game, 2).turns).toBe(1);
  });

  it("turns a frame back as it was after four quarter turns", () => {
    const game = gameFrom(TALL);

    const round = [1, 1, 1, 1].reduce(turnFrame, game);

    expect(round).toEqual(game);
  });

  it("takes a turn counterclockwise as the clockwise turns that end the same", () => {
    const game = gameFrom(TALL);

    expect(turnFrame(game, -1)).toEqual(turnFrame(game, 3));
  });

  it("makes a dasher across one that runs down, as it runs on the screen", () => {
    const game = gameFrom({ pieces: ["br", "ga"], marks: ["-|", ".."] });

    const { board } = turnFrame(game, 1);

    expect(pictureOf(board).marks).toEqual([".|", ".-"]);
  });

  it("leaves the game it is handed as it was", () => {
    const game = gameFrom(TALL);
    const before = structuredClone(game);

    turnFrame(game, 1);

    expect(game).toEqual(before);
  });
});

describe("onScreen", () => {
  it.each(TURNS)(
    "finds on the screen the square each piece showed, %i quarter turns round",
    (turns) => {
      const game = gameFrom(TALL);
      const turned = turnFrame(game, turns);
      const { width, height } = turned.board;

      const shown = squaresOf(width, height).map(
        (square) => game.board.pieces[onScreen(turned, square)],
      );

      expect(shown).toEqual(turned.board.pieces);
    },
  );

  it("finds the first square of a frame turned a quarter at the screen's bottom left", () => {
    const turned = turnFrame(gameFrom(TALL), 1);

    expect(onScreen(turned, 0)).toBe(4);
  });
});

describe("fromScreen", () => {
  it.each(TURNS)(
    "finds the square a square of the screen shows, %i quarter turns round",
    (turns) => {
      const turned = turnFrame(gameFrom(TALL), turns);
      const { width, height } = turned.board;

      const back = squaresOf(width, height).map((square) =>
        fromScreen(turned, onScreen(turned, square)),
      );

      expect(back).toEqual(squaresOf(width, height));
    },
  );
});

describe("freshLanes", () => {
  it("gives each frame a lane a column of it, none having let a fuzzball in", () => {
    expect(freshLanes({ width: 2, height: 3 })).toEqual([
      [0, 0],
      [0, 0, 0],
      [0, 0],
      [0, 0, 0],
    ]);
  });
});
