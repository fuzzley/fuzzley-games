import { recordOf } from "@fz/core/records";
import {
  type BoardPicture,
  type GameOptions,
  gameFrom,
  pictureOf,
} from "../../testing/board_picture";
import { MOVE_FIXTURES, type MoveFixture } from "../../testing/move_fixtures";
import { HOLDS_ONLY, NO_PART } from "../../testing/partial_rules";
import type { Game } from "../board/board";
import { onScreen, turnFrame } from "../board/orientation";
import { ELEMENT_IDS, type ElementId } from "../catalog/elements";
import type { ElementRule } from "../elements/element_rule";
import { ELEMENT_RULES } from "../elements/element_rules";
import { refillKind } from "./refill";
import { type Settled, settle } from "./settle";

/** The moves played by hand whose first wave only gathers, so what falls after it is the board's settling alone. */
const GATHERING = [
  "bunch",
  "dasherAcrossMade",
  "dasherDownMade",
  "pufferMade",
  "wispMade",
  "twoWaves",
  "rollAndRefill",
  "dustSwept",
  "cageBunched",
  "burrBrushedOff",
] as const satisfies readonly (keyof typeof MOVE_FIXTURES)[];

/**
 * Returns a move played by hand's game as its first wave leaves the board
 * to fall: its swap made, and each square of its bunches emptied but the
 * one a bunch leaves something on.
 */
function gatheredBy({ picture, options, record }: MoveFixture): Game {
  const game = gameFrom(picture, options);
  const pieces = [...game.board.pieces];
  const { from, to } = record.swap;
  [pieces[from], pieces[to]] = [pieces[to] ?? null, pieces[from] ?? null];
  for (const { squares, makes } of record.waves[0]?.bunches ?? []) {
    for (const square of squares.filter((each) => each !== makes?.square)) {
      pieces[square] = null;
    }
  }
  return { ...game, board: { ...game.board, pieces } };
}

/** Returns how a board drawn as a picture settles, and its pieces' picture once it rests, by the rules given. */
function settled(
  picture: BoardPicture | readonly string[],
  options: GameOptions & { readonly movesPlayed?: number } = {},
  rules = HOLDS_ONLY,
): Settled & { readonly pieces: readonly string[] } {
  const { movesPlayed = 0, ...gameOptions } = options;
  const result = settle(
    { ...gameFrom(picture, gameOptions), movesPlayed },
    rules,
  );
  return { ...result, pieces: pictureOf(result.game.board).pieces };
}

describe("settle", () => {
  it.each(GATHERING)(
    "lets everything fall as the sketch did after the bunch, in %s",
    (name) => {
      const fixture = MOVE_FIXTURES[name];

      const { falls } = settle(gatheredBy(fixture), HOLDS_ONLY);

      expect(falls).toEqual(fixture.record.waves[0].falls);
    },
  );

  it("lets a piece fall straight down its column, to the bottom", () => {
    const { pieces, falls } = settled(["r", " ", " "], {
      kinds: ["red", "blue"],
    });

    expect({ bottom: pieces[2], fall: falls[0] }).toEqual({
      bottom: "r",
      fall: { piece: 1, kind: "red", from: 0, path: [2], lane: 0 },
    });
  });

  it("lets a piece fall past a gap", () => {
    const { falls } = settled(["r", "_", " "]);

    expect(falls[0]).toEqual({
      piece: 1,
      kind: "red",
      from: 0,
      path: [2],
      lane: 0,
    });
  });

  it("lets the frizzball, a sleepyhead and a brick no rule holds fall, with no kind", () => {
    const { falls } = settled(["fz1", "   "], {}, NO_PART);

    expect(falls.filter(({ from }) => from !== null)).toEqual([
      { piece: 1, kind: null, from: 0, path: [3], lane: 0 },
      { piece: 2, kind: null, from: 1, path: [4], lane: 1 },
      { piece: 3, kind: null, from: 2, path: [5], lane: 2 },
    ]);
  });

  it("lets a piece an element's rule holds stand, and nothing through it", () => {
    const { pieces, falls } = settled(["b", "1", " "]);

    expect({ pieces, falls }).toEqual({ pieces: ["b", "1", " "], falls: [] });
  });

  it("fills each square nothing falls into from its lane, the lowest first", () => {
    const game = gameFrom(["  ", "r "], { seed: 5 });

    const { falls } = settle(game, HOLDS_ONLY);

    expect(falls).toEqual([
      {
        piece: 2,
        kind: refillKind(game, 0, 0),
        from: null,
        path: [0],
        lane: 0,
      },
      {
        piece: 3,
        kind: refillKind(game, 1, 0),
        from: null,
        path: [3],
        lane: 1,
      },
      {
        piece: 4,
        kind: refillKind(game, 1, 1),
        from: null,
        path: [1],
        lane: 1,
      },
    ]);
  });

  it("counts what each lane of the frame lets in, and the pieces made", () => {
    const { game } = settled(["  ", "r "]);

    expect({ lanes: game.lanes, nextPieceId: game.nextPieceId }).toEqual({
      lanes: [
        [1, 2],
        [0, 0],
        [0, 0],
        [0, 0],
      ],
      nextPieceId: 5,
    });
  });

  it("rolls the fuzzball diagonally above into a square a piece held holds up", () => {
    const { pieces, falls } = settled(["a1g", "r r"], {
      kinds: ["amber", "green", "red"],
    });

    expect({ below: pieces[1], roll: falls[0] }).toEqual({
      below: "rar",
      roll: { piece: 1, kind: "amber", from: 0, path: [4], lane: 1 },
    });
  });

  it("rolls from the right first on every other move", () => {
    const { falls } = settled(["a1g", "r r"], { movesPlayed: 1 });

    expect(falls[0]).toEqual({
      piece: 3,
      kind: "green",
      from: 2,
      path: [4],
      lane: 1,
    });
  });

  it("rolls no piece an element's rule holds", () => {
    const { falls } = settled(["A1g", "r r"]);

    expect(falls[0]).toEqual({
      piece: 3,
      kind: "green",
      from: 2,
      path: [4],
      lane: 1,
    });
  });

  it("rolls into the leftmost square of a row first", () => {
    const { falls } = settled(["1a1", " 1 "]);

    expect(falls[0]).toEqual({
      piece: 2,
      kind: "amber",
      from: 1,
      path: [3],
      lane: 0,
    });
  });

  it("rolls into the lowest row first", () => {
    const { falls } = settled(["1a.", " r1", "gb "]);

    expect(falls[0]).toEqual({
      piece: 4,
      kind: "red",
      from: 4,
      path: [8],
      lane: 2,
    });
  });

  it("lets a fuzzball fall on after it rolls, its way down one", () => {
    const { falls } = settled(["1a", " 1", "  "]);

    expect(falls[0]).toEqual({
      piece: 2,
      kind: "amber",
      from: 1,
      path: [2, 4],
      lane: 0,
    });
  });

  it("lets a lane of a frame turned fill from that frame's lanes", () => {
    const game = turnFrame(gameFrom(["_2_", "a a", "arg"], { seed: 2 }), 1);
    const screen = (square: number): number => onScreen(game, square);

    const { falls } = settle(game, HOLDS_ONLY);

    expect(
      falls.map(({ from, path, kind, lane }) => ({
        kind,
        from: from === null ? null : screen(from),
        path: path.map(screen),
        lane,
      })),
    ).toEqual(
      MOVE_FIXTURES.windTurns.record.gust.waves[0].falls.map(
        ({ piece: _, ...fall }) => fall,
      ),
    );
  });

  it("moves nothing on a board at rest", () => {
    const game = gameFrom(["bg", "rv"]);

    expect(settle(game, HOLDS_ONLY)).toEqual({
      game,
      falls: [],
      hits: [],
      counted: recordOf(ELEMENT_IDS, () => 0),
    });
  });

  it("leaves the game it is handed as it was", () => {
    const game = gameFrom(["a1g", "r  "]);
    const before = structuredClone(game);

    settle(game, HOLDS_ONLY);

    expect(game).toEqual(before);
  });

  it("puts a sleepyhead on a bed to bed once the board is at rest, counting it, and lets the board fall again", () => {
    const game = gameFrom(["bz", "r "], { goals: [{ what: "sleepyhead" }] });

    const { game: rested, falls, hits, counted } = settle(game, ELEMENT_RULES);

    expect([
      hits,
      rested.goalsLeft,
      counted.sleepyhead,
      falls.map(({ piece, from, path }) => [piece, from, path]),
    ]).toEqual([
      [{ what: "bedded", square: 3, piece: 2 }],
      [0],
      1,
      [
        [2, 1, [3]],
        [4, null, [1, 3]],
        [5, null, [1]],
      ],
    ]);
  });

  it("leaves a sleepyhead on its bed where no element takes part in the board at rest", () => {
    const game = gameFrom(["bz", "r "], { goals: [{ what: "sleepyhead" }] });

    const { game: rested, hits } = settle(game, HOLDS_ONLY);

    expect([rested.board.pieces[3]?.what, hits, rested.goalsLeft]).toEqual([
      "sleepyhead",
      [],
      [1],
    ]);
  });

  it("makes each change the board at rest makes, counting those that count, toward no goal where its element has none", () => {
    // Dust that comes off at rest, with no hit and no goal of its own,
    // counting where it lay 2 deep.
    const rules: Readonly<Record<ElementId, ElementRule>> = {
      ...NO_PART,
      dust: {
        settled: ({ piece, dust }) =>
          dust === 0
            ? null
            : { square: { piece, dust: 0 }, hit: null, counts: dust === 2 },
      },
    };
    const game = gameFrom(
      { pieces: ["bg", "rv"], dust: ["21", "00"] },
      { goals: [{ what: "dust" }], goalsLeft: [3] },
    );

    const { game: rested, hits, counted } = settle(game, rules);

    expect([rested.board.dust, hits, counted.dust, rested.goalsLeft]).toEqual([
      [0, 0, 0, 0],
      [],
      1,
      [3],
    ]);
  });

  it("starts a fall afresh for a piece the board at rest puts in another's place", () => {
    // At rest, the blue fuzzball is made anew where it lands; then the
    // sleepyhead under it is put to bed and the new one falls on.
    const rules: Readonly<Record<ElementId, ElementRule>> = {
      ...ELEMENT_RULES,
      dust: {
        settled: ({ piece, dust }) =>
          piece?.what === "fuzzball" && piece.id === 1
            ? {
                square: { piece: { ...piece, id: 9 }, dust },
                hit: null,
                counts: false,
              }
            : null,
      },
    };
    const game = gameFrom(["b", "z", " "]);

    const { falls } = settle(game, rules);

    expect(falls.map(({ piece, from, path }) => [piece, from, path])).toEqual([
      [2, 1, [2]],
      [1, 0, [1]],
      [3, null, [0, 1]],
      [9, 1, [2]],
      [4, null, [0]],
    ]);
  });

  it("asks the board at rest again after a change to its dust alone", () => {
    // Dust that comes off at rest a layer at a time.
    const rules: Readonly<Record<ElementId, ElementRule>> = {
      ...NO_PART,
      dust: {
        settled: ({ piece, dust }) =>
          dust === 0
            ? null
            : {
                square: { piece, dust: dust === 2 ? 1 : 0 },
                hit: null,
                counts: true,
              },
      },
    };
    const game = gameFrom({ pieces: ["b"], dust: ["2"] });

    const { game: rested, counted } = settle(game, rules);

    expect([rested.board.dust, counted.dust]).toEqual([[0], 2]);
  });

  it("comes to rest where a change at rest leaves its square as it was", () => {
    const rules: Readonly<Record<ElementId, ElementRule>> = {
      ...NO_PART,
      dust: { settled: (square) => ({ square, hit: null, counts: true }) },
    };
    const game = gameFrom(["bg", "rv"]);

    const { counted } = settle(game, rules);

    expect(counted.dust).toBe(4);
  });
});
