import {
  type BoardPicture,
  type GameOptions,
  gameFrom,
} from "../../testing/board_picture";
import { DESIGN_PARTS, DESIGN_WIND } from "../../testing/made_up_rules";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import type { Game } from "../board/board";
import { turnFrame } from "../board/orientation";
import type { WindRule } from "../elements/element_rule";
import { type Played, play } from "./play";

/** The name of a move played by hand. */
type FixtureName = keyof typeof MOVE_FIXTURES;

/** A board on which swapping 1 and 4 bunches the blues across the top. */
const BLUES_ACROSS: BoardPicture = { pieces: ["bgb", "rbr", "avp"] };

/** A goal of gathering 30 blues, which no move here meets. */
const PLAYING: GameOptions = {
  goals: [{ what: "gather", kind: "blue", count: 30 }],
};

/** A wind that turns after every move, a quarter at a time. */
const EVERY_MOVE = { every: 1, quarters: 1, wait: 1 };

/** Returns a move played by hand played again by `play()`, on its game and its swap. */
function replayed(name: FixtureName, wind: WindRule = DESIGN_WIND): Played {
  const { picture, options, record } = MOVE_FIXTURES[name];
  return play(
    gameFrom(picture, options),
    record.swap.from,
    record.swap.to,
    DESIGN_PARTS,
    wind,
  );
}

/** Returns the blues bunched across the top of `BLUES_ACROSS` on a game of the options given. */
function bunchedAcross(options: GameOptions, wind = DESIGN_WIND): Played {
  return play(gameFrom(BLUES_ACROSS, options), 1, 4, DESIGN_PARTS, wind);
}

describe("play", () => {
  it.each([
    ["makes no bunch", 6, 7],
    ["swaps squares that aren't neighbors", 1, 7],
    ["taps a plain fuzzball", 4, 4],
  ])("refuses a swap that %s, costing nothing", (_, from, to) => {
    const game = gameFrom(BLUES_ACROSS, PLAYING);

    const played = play(game, from, to, DESIGN_PARTS, DESIGN_WIND);

    expect(played).toEqual({
      game,
      record: {
        swap: { from, to, refused: true },
        waves: [],
        burrSpread: null,
        gust: null,
        shuffle: null,
        outcome: "playing",
      },
    });
    expect(played.game).toBe(game);
  });

  it.each(["cleared", "over"] as const)(
    "refuses any move on a game %s",
    (outcome) => {
      const game: Game = { ...gameFrom(BLUES_ACROSS, PLAYING), outcome };

      const { record } = play(game, 1, 4, DESIGN_PARTS, DESIGN_WIND);

      expect([record.swap.refused, record.waves, record.outcome]).toEqual([
        true,
        [],
        outcome,
      ]);
    },
  );

  it.each([-1, 9])("throws for square %s, off the board", (square) => {
    const game = gameFrom(BLUES_ACROSS, PLAYING);

    expect(() => play(game, square, 4, DESIGN_PARTS, DESIGN_WIND)).toThrow(
      RangeError,
    );
  });

  it.each(["bunch", "twoWaves", "dasherSetsOffPuffer"] as const)(
    "plays each wave to rest as the sketch did, in %s",
    (name) => {
      const { record } = replayed(name);

      expect(record).toEqual(MOVE_FIXTURES[name].record);
    },
  );

  it("counts the move, a move less left and one more played", () => {
    const { game } = bunchedAcross({ ...PLAYING, movesLeft: 5 });

    expect([game.movesLeft, game.movesPlayed, game.outcome]).toEqual([
      4,
      1,
      "playing",
    ]);
  });

  it("clears the level on a move that leaves every goal met", () => {
    const { game, record } = replayed("cleared");

    expect([record, game.outcome]).toEqual([
      MOVE_FIXTURES.cleared.record,
      "cleared",
    ]);
  });

  it("ends the game on its last move where a goal is still open", () => {
    const { game, record } = replayed("outOfMoves");

    expect([record, game.outcome, game.movesLeft]).toEqual([
      MOVE_FIXTURES.outOfMoves.record,
      "over",
      0,
    ]);
  });

  it("clears the level on its last move where that move meets every goal", () => {
    const { game } = bunchedAcross({
      goals: [{ what: "gather", kind: "blue", count: 3 }],
      movesLeft: 1,
    });

    expect(game.outcome).toBe("cleared");
  });

  it("turns the wind after a move, as the sketch does, everything falling the new way", () => {
    const { game, record } = replayed("windTurns");

    expect([record, game.turns, game.wind]).toEqual([
      MOVE_FIXTURES.windTurns.record,
      1,
      EVERY_MOVE,
    ]);
  });

  it("counts a turning wind's wait down where it isn't yet due", () => {
    const { game, record } = bunchedAcross({
      ...PLAYING,
      wind: { every: 3, quarters: 1, wait: 3 },
    });

    expect([record.gust, game.turns, game.wind]).toEqual([
      null,
      0,
      { every: 3, quarters: 1, wait: 2 },
    ]);
  });

  it("leaves a turning wind as it is where the wind's rule takes no part", () => {
    const { game, record } = bunchedAcross(
      { ...PLAYING, wind: EVERY_MOVE },
      {},
    );

    expect([record.gust, game.turns, game.wind]).toEqual([null, 0, EVERY_MOVE]);
  });

  it("turns no wind after the move that clears the level", () => {
    const { game, record } = bunchedAcross({
      goals: [{ what: "gather", kind: "blue", count: 3 }],
      wind: EVERY_MOVE,
    });

    expect([record.gust, game.turns, game.wind]).toEqual([null, 0, EVERY_MOVE]);
  });

  it("clears the level where the wind's turn meets the last goal", () => {
    // The move bunches greens; turned, the board lets in the ambers that
    // bunch in the square the brick held open.
    const game = gameFrom(["_2_", "aag", "rga", "gag"], {
      kinds: ["blue", "red", "amber", "green"],
      goals: [{ what: "gather", kind: "amber", count: 4 }],
      seed: 11,
      wind: EVERY_MOVE,
    });

    const { record } = play(game, 7, 10, DESIGN_PARTS, DESIGN_WIND);

    expect([
      record.waves.flatMap(({ bunches }) => bunches.map(({ kind }) => kind)),
      record.gust?.waves.flatMap(({ bunches }) =>
        bunches.map(({ kind }) => kind),
      ),
      record.outcome,
    ]).toEqual([["green"], ["amber"], "cleared"]);
  });

  it("takes the move in, and hands its record back, in the screen's frame", () => {
    // The frame turned, the screen still shows the board as drawn.
    const game = turnFrame(gameFrom(BLUES_ACROSS, PLAYING), 1);

    const { record } = play(game, 1, 4, DESIGN_PARTS, DESIGN_WIND);

    expect([
      record.swap,
      record.waves[0]?.bunches,
      record.waves[0]?.hits.map(({ square }) => square),
    ]).toEqual([
      { from: 1, to: 4, refused: false },
      [{ squares: [0, 1, 2], kind: "blue", makes: null }],
      [0, 1, 2],
    ]);
  });

  it("leaves the game it is handed as it was", () => {
    const game = gameFrom(BLUES_ACROSS, { ...PLAYING, wind: EVERY_MOVE });
    const before = structuredClone(game);

    play(game, 1, 4, DESIGN_PARTS, DESIGN_WIND);

    expect(game).toEqual(before);
  });
});
