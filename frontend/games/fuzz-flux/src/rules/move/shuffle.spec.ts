import {
  type BoardPicture,
  gameFrom,
  pictureOf,
} from "../../testing/board_picture";
import { DESIGN_HOLDS } from "../../testing/made_up_rules";
import type { Game } from "../board/board";
import { findBunches } from "../bunches/find";
import type { KindId } from "../catalog/kinds";
import { shuffle } from "./shuffle";
import { legalMoves } from "./swap";

/** The kinds the boards here play with. */
const KINDS: readonly KindId[] = ["blue", "red", "amber", "green"];

/** A board with no move to make, as a move left the sketch's own. */
const STUCK: BoardPicture = { pieces: ["aar", "rgr", "aga"] };

/** Returns a game of a board drawn as a picture, with the kinds here. */
function gameOf(picture: BoardPicture): Game {
  return gameFrom(picture, { kinds: KINDS, seed: 15 });
}

describe("shuffle", () => {
  it("leaves a board with no move one with a move and no bunch standing", () => {
    const { game } = shuffle(gameOf(STUCK), DESIGN_HOLDS);

    expect([
      legalMoves(game.board, DESIGN_HOLDS).length > 0,
      findBunches(game.board, null),
    ]).toEqual([true, []]);
  });

  it("writes each plain fuzzball's trade, in the board's order, where it was and where it went", () => {
    const { game, moves } = shuffle(gameOf(STUCK), DESIGN_HOLDS);

    expect([pictureOf(game.board).pieces, moves]).toEqual([
      ["rag", "aag", "arr"],
      [
        { piece: 1, from: 0, to: 4 },
        { piece: 2, from: 1, to: 6 },
        { piece: 3, from: 2, to: 8 },
        { piece: 4, from: 3, to: 7 },
        { piece: 5, from: 4, to: 5 },
        { piece: 6, from: 5, to: 0 },
        { piece: 7, from: 6, to: 3 },
        { piece: 8, from: 7, to: 2 },
        { piece: 9, from: 8, to: 1 },
      ],
    ]);
  });

  it("trades the plain fuzzballs alone: no special, nothing an element holds, and no gap", () => {
    const game = gameOf({
      pieces: ["aAr", "r_r", "a1a"],
      marks: ["..|", "...", "..."],
    });

    const { game: shuffled, moves } = shuffle(game, DESIGN_HOLDS);

    expect([
      moves.map(({ from }) => from),
      pictureOf(shuffled.board).marks?.[0],
      [1, 4, 7].map((square) => shuffled.board.pieces[square]),
    ]).toEqual([
      [0, 3, 5, 6, 8],
      "..|",
      [1, 4, 7].map((square) => game.board.pieces[square]),
    ]);
  });

  it("draws the same trades from the same game, and others once a move more is played", () => {
    const game = gameOf(STUCK);

    const trades = (from: Game): readonly number[] =>
      shuffle(from, DESIGN_HOLDS).moves.map(({ to }) => to);

    expect(trades(game)).toEqual(trades(game));
    expect(trades({ ...game, movesPlayed: 1 })).not.toEqual(trades(game));
  });

  it("keeps the last order tried where no order gives a move", () => {
    // Four kinds in a row of four make no bunch and no move, in any order.
    const game = gameOf({ pieces: ["barg"] });

    const { game: shuffled, moves } = shuffle(game, DESIGN_HOLDS);

    expect([pictureOf(shuffled.board).pieces, moves]).toEqual([
      ["abgr"],
      [
        { piece: 1, from: 0, to: 1 },
        { piece: 2, from: 1, to: 0 },
        { piece: 3, from: 2, to: 3 },
        { piece: 4, from: 3, to: 2 },
      ],
    ]);
  });

  it("leaves the game it is handed as it was", () => {
    const game = gameOf(STUCK);
    const before = structuredClone(game);

    shuffle(game, DESIGN_HOLDS);

    expect(game).toEqual(before);
  });
});
