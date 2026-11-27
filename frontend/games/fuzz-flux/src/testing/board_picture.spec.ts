import type { LegendLetter } from "../rules/board/legend";
import type { KindId } from "../rules/catalog/kinds";
import type { Fuzzball, Piece } from "../rules/catalog/pieces";
import { boardFrom, gameFrom, pictureOf } from "./board_picture";

/** Returns a fuzzball numbered 1, plain unless changed. */
function fuzzball(kind: KindId, changes: Partial<Fuzzball> = {}): Fuzzball {
  return {
    what: "fuzzball",
    id: 1,
    kind,
    special: null,
    caged: false,
    burred: false,
    ...changes,
  };
}

/**
 * What a picture of one square reads each letter of the legend as, a
 * fuzzball of any kind taking blue, the first kind in play that the
 * picture names none of.
 */
const READS = {
  ".": fuzzball("blue"),
  "?": fuzzball("blue", { caged: true }),
  "*": fuzzball("blue", { burred: true }),
  b: fuzzball("blue"),
  r: fuzzball("red"),
  a: fuzzball("amber"),
  g: fuzzball("green"),
  v: fuzzball("violet"),
  p: fuzzball("pink"),
  B: fuzzball("blue", { caged: true }),
  R: fuzzball("red", { caged: true }),
  A: fuzzball("amber", { caged: true }),
  G: fuzzball("green", { caged: true }),
  V: fuzzball("violet", { caged: true }),
  P: fuzzball("pink", { caged: true }),
  "1": { what: "brick", id: 1, layers: 1 },
  "2": { what: "brick", id: 1, layers: 2 },
  "3": { what: "brick", id: 1, layers: 3 },
  "4": { what: "brick", id: 1, layers: 4 },
  z: { what: "sleepyhead", id: 1 },
  _: null,
} as const satisfies Readonly<Record<LegendLetter, Piece | null>>;

describe("boardFrom", () => {
  it.each(Object.entries(READS))(
    "reads %j as a level does",
    (letter, piece) => {
      expect(boardFrom([letter]).pieces).toEqual([piece]);
    },
  );

  it("reads f as the frizzball", () => {
    expect(boardFrom(["f"]).pieces).toEqual([{ what: "frizzball", id: 1 }]);
  });

  it("reads a space as a square that holds nothing", () => {
    const { open, pieces } = boardFrom([" "]);

    expect({ open, pieces }).toEqual({ open: [true], pieces: [null] });
  });

  it("opens every square but a gap", () => {
    expect(boardFrom(["b_", " 1"]).open).toEqual([true, false, true, true]);
  });

  it("numbers the pieces from 1, row by row", () => {
    const ids = boardFrom(["r_g", " zb"]).pieces.map((piece) => piece?.id);

    expect(ids).toEqual([1, undefined, 2, undefined, 3, 4]);
  });

  it("gives fuzzballs of any kind the first two kinds the picture names none of, in turn like a checkerboard", () => {
    const kinds = boardFrom(["b..", "..?"]).pieces.map(
      (piece) => piece?.what === "fuzzball" && piece.kind,
    );

    expect(kinds).toEqual(["blue", "amber", "red", "amber", "red", "amber"]);
  });

  it("takes the kinds of fuzzballs of any kind from the kinds in play", () => {
    const kinds = boardFrom([".."], ["green", "pink", "red"]).pieces.map(
      (piece) => piece?.what === "fuzzball" && piece.kind,
    );

    expect(kinds).toEqual(["green", "pink"]);
  });

  it("throws for a fuzzball of any kind where the picture leaves too few kinds to it", () => {
    expect(() => boardFrom(["b."], ["blue", "red"])).toThrow(
      "A picture with a fuzzball of any kind leaves two kinds in play to it, naming none of them.",
    );
  });

  it("reads a picture naming every kind with no fuzzball of any kind", () => {
    expect(boardFrom(["brag"], ["blue", "red", "amber", "green"]).width).toBe(
      4,
    );
  });

  it.each([
    ["-", "dasher-across"],
    ["|", "dasher-down"],
    ["o", "puffer"],
    ["w", "wisp"],
  ] as const)("marks %s as a %s", (mark, special) => {
    const { pieces } = boardFrom({ pieces: ["g"], marks: [mark] });

    expect(pieces).toEqual([fuzzball("green", { special })]);
  });

  it("marks * as a burr", () => {
    const { pieces } = boardFrom({ pieces: ["g"], marks: ["*"] });

    expect(pieces).toEqual([fuzzball("green", { burred: true })]);
  });

  it("marks . as nothing beyond a piece's kind", () => {
    const { pieces } = boardFrom({ pieces: ["g1"], marks: [".."] });

    expect(pieces).toEqual([
      fuzzball("green"),
      { what: "brick", id: 2, layers: 1 },
    ]);
  });

  it.each([
    ["a special on a caged fuzzball", "G", "-"],
    ["a burr on a caged fuzzball", "G", "*"],
    ["a special on a burred fuzzball", "*", "o"],
    ["a special on the frizzball", "f", "w"],
    ["a burr on a brick", "2", "*"],
    ["a mark of no legend", "g", "x"],
  ])("throws for %s", (_, pieces, marks) => {
    expect(() => boardFrom({ pieces: [pieces], marks: [marks] })).toThrow(
      `A picture's "${marks}" at column 1, row 1 is no mark the piece there can wear.`,
    );
  });

  it.each([
    ["rows", ["."]],
    ["a row's squares", ["..", "."]],
  ])("throws for marks of other %s than the pieces'", (_, marks) => {
    expect(() => boardFrom({ pieces: ["..", ".."], marks })).toThrow(
      "A picture's marks are drawn in its pieces' shape.",
    );
  });

  it("lays the dust as a level's is drawn", () => {
    expect(
      boardFrom({ pieces: ["b_", "rg"], dust: ["10", "02"] }).dust,
    ).toEqual([1, 0, 0, 2]);
  });

  it("makes beds where a level would", () => {
    expect(boardFrom(["z.", ".."]).beds).toEqual([false, false, true, true]);
  });

  it("throws for letters of no legend", () => {
    expect(() => boardFrom(["bx"])).toThrow(/a "x", which no level draws in/);
  });

  it("throws for a fuzzball of a kind not in play", () => {
    expect(() => boardFrom(["bV"], ["blue", "red", "amber"])).toThrow(
      "A picture draws a violet fuzzball, a kind not in play.",
    );
  });
});

describe("gameFrom", () => {
  it("plays on the board in the screen's frame, no move played and no lane let in", () => {
    const { board, turns, movesPlayed, lanes, nextPieceId, outcome } = gameFrom(
      ["bb_", "rr "],
    );

    expect({ turns, movesPlayed, lanes, nextPieceId, outcome }).toEqual({
      turns: 0,
      movesPlayed: 0,
      lanes: [
        [0, 0, 0],
        [0, 0],
        [0, 0, 0],
        [0, 0],
      ],
      nextPieceId: 5,
      outcome: "playing",
    });
    expect(board).toEqual(boardFrom(["bb_", "rr "]));
  });

  it("plays with every kind, no goal, 20 moves, the seed 1 and no turning wind unless told", () => {
    const { kinds, goals, goalsLeft, movesLeft, seed, wind } = gameFrom(["b"]);

    expect({ kinds, goals, goalsLeft, movesLeft, seed, wind }).toEqual({
      kinds: ["blue", "red", "amber", "green", "violet", "pink"],
      goals: [],
      goalsLeft: [],
      movesLeft: 20,
      seed: 1,
      wind: null,
    });
  });

  it("throws for a goal that gathers a kind not in play", () => {
    expect(() =>
      gameFrom(["b"], {
        kinds: ["blue", "red", "amber"],
        goals: [{ what: "gather", kind: "pink", count: 3 }],
      }),
    ).toThrow("A game's goal gathers pink fuzzballs, a kind not in play.");
  });

  it("plays as the options say", () => {
    const options = {
      kinds: ["blue", "red", "green", "pink"],
      goals: [{ what: "gather", kind: "red", count: 10 }],
      goalsLeft: [3],
      movesLeft: 4,
      seed: 99,
      wind: { every: 3, quarters: 1, wait: 2 },
    } as const;

    const { kinds, goals, goalsLeft, movesLeft, seed, wind } = gameFrom(
      ["b."],
      options,
    );

    expect({ kinds, goals, goalsLeft, movesLeft, seed, wind }).toEqual(options);
  });

  it("leaves each goal what it asks of the board, unless told", () => {
    const game = gameFrom(
      { pieces: ["z2R", "1zB"], dust: ["001", "120"] },
      {
        goals: [
          { what: "gather", kind: "pink", count: 12 },
          { what: "dust" },
          { what: "brick" },
          { what: "cage" },
          { what: "sleepyhead" },
        ],
      },
    );

    expect(game.goalsLeft).toEqual([12, 4, 2, 2, 2]);
  });
});

describe("pictureOf", () => {
  it("draws a board as boardFrom() reads it", () => {
    const picture = {
      pieces: ["bR_f", " 3zp"],
      marks: ["-...", "...*"],
      dust: ["2000", "0101"],
    };

    expect(pictureOf(boardFrom(picture))).toEqual(picture);
  });

  it.each([
    ["dasher-across", "-"],
    ["dasher-down", "|"],
    ["puffer", "o"],
    ["wisp", "w"],
  ] as const)("marks a %s %s", (special, mark) => {
    const board = boardFrom(["a"]);

    const { marks } = pictureOf({
      ...board,
      pieces: [fuzzball("amber", { special })],
    });

    expect(marks).toEqual([mark]);
  });

  it.each([
    ["caged", { caged: true }],
    ["burred", { burred: true }],
  ])("throws for a special that is %s", (_, changes) => {
    const board = boardFrom(["a"]);

    expect(() =>
      pictureOf({
        ...board,
        pieces: [fuzzball("amber", { special: "wisp", ...changes })],
      }),
    ).toThrow(
      "No board holds a special that is caged or burred, as piece 1 is.",
    );
  });

  it("leaves out marks and dust where the board has none", () => {
    expect(pictureOf(boardFrom(["ga", "4V"]))).toEqual({
      pieces: ["ga", "4V"],
    });
  });
});
