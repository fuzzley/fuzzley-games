import { keysOf } from "@fz/core/records";
import {
  type BoardPicture,
  type GameOptions,
  gameFrom,
} from "../../testing/board_picture";
import {
  DESIGN_PARTS,
  DESIGN_WIND,
  NO_PART,
} from "../../testing/made_up_rules";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import type { Game } from "../board/board";
import { turnFrame } from "../board/orientation";
import type { ElementId } from "../catalog/elements";
import type { ElementRule, WindRule } from "../elements/element_rule";
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

/**
 * A board on which swapping 7 and 10 bunches greens, and the wind's turn
 * then lets in the ambers that bunch in the square, 4, that the brick held
 * open.
 */
const HELD_OPEN: BoardPicture = { pieces: ["_2_", "aag", "rga", "gag"] };

/** A game of `HELD_OPEN` whose one goal its ambers meet, the wind turning after every move. */
const HELD_OPEN_LEVEL: GameOptions = {
  kinds: ["blue", "red", "amber", "green"],
  goals: [{ what: "gather", kind: "amber", count: 4 }],
  seed: 11,
  wind: EVERY_MOVE,
};

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
      new RangeError(`Square ${String(square)} is off the board.`),
    );
  });

  it.each(keysOf(MOVE_FIXTURES))("plays %s as the sketch did", (name) => {
    const { record } = replayed(name);

    expect(record).toEqual(MOVE_FIXTURES[name].record);
  });

  it("counts the move, a move less left and one more played", () => {
    const { game } = bunchedAcross({ ...PLAYING, movesLeft: 2 });

    expect([game.movesLeft, game.movesPlayed, game.outcome]).toEqual([
      1,
      1,
      "playing",
    ]);
  });

  it("clears the level on a move that leaves every goal met", () => {
    const { game } = replayed("cleared");

    expect(game.outcome).toBe("cleared");
  });

  it("ends the game on its last move where a goal is still open", () => {
    const { game } = replayed("outOfMoves");

    expect([game.outcome, game.movesLeft]).toEqual(["over", 0]);
  });

  it("clears the level on its last move where that move meets every goal", () => {
    const { game } = bunchedAcross({
      goals: [{ what: "gather", kind: "blue", count: 3 }],
      movesLeft: 1,
    });

    expect(game.outcome).toBe("cleared");
  });

  it("puts the burr it spreads on the fuzzball it spreads to", () => {
    const { game } = replayed("burrSpreads");

    expect(game.board.pieces[3]).toEqual(
      expect.objectContaining({ id: 4, burred: true }),
    );
  });

  it("spreads no burr after a move that brushed one off, though another could spread", () => {
    // The bunch brushes the burr beside it off; the one at the corner stays.
    const game = gameFrom(
      { ...BLUES_ACROSS, marks: ["...", "*..", "..*"] },
      PLAYING,
    );

    const { game: played, record } = play(
      game,
      1,
      4,
      DESIGN_PARTS,
      DESIGN_WIND,
    );

    expect([
      record.waves[0]?.hits.filter(({ what }) => what === "unburred").length,
      played.board.pieces[8],
      record.burrSpread,
    ]).toEqual([1, expect.objectContaining({ burred: true }), null]);
  });

  it("spreads no burr after the move that clears the level", () => {
    const { record } = play(
      gameFrom(
        { ...BLUES_ACROSS, marks: ["...", "...", "*.."] },
        { goals: [{ what: "gather", kind: "blue", count: 3 }] },
      ),
      1,
      4,
      DESIGN_PARTS,
      DESIGN_WIND,
    );

    expect([record.burrSpread, record.outcome]).toEqual([null, "cleared"]);
  });

  it("hands a burr's spread back in the screen's frame", () => {
    const game = turnFrame(
      gameFrom({ ...BLUES_ACROSS, marks: ["...", "...", "*.."] }, PLAYING),
      1,
    );

    const { record } = play(game, 1, 4, DESIGN_PARTS, DESIGN_WIND);

    expect(record.burrSpread).toEqual({ from: 6, to: 7, piece: 8 });
  });

  it("throws for a burr spread to a square that holds no fuzzball", () => {
    const rules = {
      ...NO_PART,
      burr: { moveEnded: () => ({ from: 7, to: 8 }) },
    };
    const game = gameFrom(["bgb", "rbr", "av1"], PLAYING);

    expect(() => play(game, 1, 4, rules, DESIGN_WIND)).toThrow(
      "A burr spreads to square 8, which holds no fuzzball.",
    );
  });

  it("shuffles no board after the level's last move", () => {
    const { picture, options } = MOVE_FIXTURES.shuffle;
    const game = gameFrom(picture, { ...options, movesLeft: 1 });

    const { record } = play(game, 1, 4, DESIGN_PARTS, DESIGN_WIND);

    expect([record.shuffle, record.outcome]).toEqual([null, "over"]);
  });

  it("hands a shuffle back in the screen's frame, as the sketch does", () => {
    // On this deal the board the move leaves, its frame turned, has no move.
    const { picture, options } = MOVE_FIXTURES.shuffle;
    const game = turnFrame(gameFrom(picture, { ...options, seed: 9 }), 1);

    const { record } = play(game, 1, 4, DESIGN_PARTS, DESIGN_WIND);

    expect(record.shuffle).toEqual({
      moves: [
        { piece: 7, from: 6, to: 4 },
        { piece: 4, from: 3, to: 1 },
        { piece: 12, from: 0, to: 0 },
        { piece: 8, from: 7, to: 7 },
        { piece: 2, from: 4, to: 3 },
        { piece: 11, from: 1, to: 5 },
        { piece: 9, from: 8, to: 6 },
        { piece: 6, from: 5, to: 2 },
        { piece: 10, from: 2, to: 8 },
      ],
    });
  });

  it("turns the board's frame when the wind turns, and its wait starts again", () => {
    const { game } = replayed("windTurns");

    expect([game.turns, game.wind]).toEqual([1, EVERY_MOVE]);
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
    const game = gameFrom(HELD_OPEN, HELD_OPEN_LEVEL);

    const { record } = play(game, 7, 10, DESIGN_PARTS, DESIGN_WIND);

    expect([
      record.waves.flatMap(({ bunches }) => bunches.map(({ kind }) => kind)),
      record.gust?.waves.flatMap(({ bunches }) =>
        bunches.map(({ kind }) => kind),
      ),
      record.outcome,
    ]).toEqual([["green"], ["amber"], "cleared"]);
  });

  it("writes the fall the wind's turn starts as it leaves the board: what its rest did, and what each goal then still needs", () => {
    // Dust lies on the square the brick held open, which a made-up rule
    // sweeps from under whatever comes to rest on it.
    const rules: Readonly<Record<ElementId, ElementRule>> = {
      ...DESIGN_PARTS,
      dust: {
        settled: ({ piece, dust }) =>
          piece !== null && dust > 0
            ? { square: { piece, dust: 0 }, hit: "dusted", counts: false }
            : null,
      },
    };
    const game = gameFrom(
      { ...HELD_OPEN, dust: ["000", "010", "000", "000"] },
      HELD_OPEN_LEVEL,
    );

    const { record } = play(game, 7, 10, rules, DESIGN_WIND);

    expect([
      record.gust?.waves[0]?.hits.map(({ what, square }) => [what, square]),
      record.gust?.waves.map(({ goalsLeft }) => goalsLeft),
    ]).toEqual([[["dusted", 4]], [[4], [0]]]);
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
