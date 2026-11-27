import { boardFrom, gameFrom } from "../../testing/board_picture";
import { DESIGN_HOLDS, NO_PART } from "../../testing/made_up_rules";
import { turnFrame } from "../board/orientation";
import type { SquareState } from "../elements/element_rule";
import { bunchMatesOf, canSwap, legalMoves, swapWorks } from "./swap";

/** Returns whether each square of a board drawn as a picture can be picked up, by the rules given. */
function pickable(
  picture: Parameters<typeof boardFrom>[0],
  rules = NO_PART,
): boolean[] {
  const board = boardFrom(picture);
  return board.pieces.map((_, square) => canSwap(board, square, rules));
}

describe("canSwap", () => {
  it("picks up a fuzzball, special or plain, and the frizzball", () => {
    expect(pickable({ pieces: ["bbf"], marks: [".o."] })).toEqual([
      true,
      true,
      true,
    ]);
  });

  it("picks up nothing from a square that holds nothing, or a gap", () => {
    expect(pickable([" _"])).toEqual([false, false]);
  });

  it("picks up no piece an element's rule holds", () => {
    const picture = { pieces: ["B1zb"], marks: ["...*"] };

    expect(pickable(picture, DESIGN_HOLDS)).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });

  it("picks up a brick or a sleepyhead where no rule holds it", () => {
    expect(pickable(["1z"])).toEqual([true, true]);
  });

  it("asks each rule of the square's dust as well as its piece", () => {
    const rules = {
      ...NO_PART,
      dust: { holdsSwap: ({ dust }: SquareState) => dust > 0 },
    };

    expect(pickable({ pieces: ["bb"], dust: ["10"] }, rules)).toEqual([
      false,
      true,
    ]);
  });
});

describe("swapWorks", () => {
  it("makes a move of a swap that bunches the fuzzball picked up", () => {
    expect(swapWorks(boardFrom(["brbb"]), 0, 1)).toBe(true);
  });

  it("makes a move of a swap that bunches the neighbor", () => {
    expect(swapWorks(boardFrom(["bbrb"]), 2, 3)).toBe(true);
  });

  it("makes none of a swap that bunches neither", () => {
    expect(swapWorks(boardFrom(["brgb"]), 0, 1)).toBe(false);
  });

  it("makes none of a swap of two of a kind, whatever stands", () => {
    expect(swapWorks(boardFrom(["bbb"]), 0, 1)).toBe(false);
  });

  it.each([
    ["a special picked up", { pieces: ["br"], marks: ["|."] }, 0, 1],
    ["a special swapped with", { pieces: ["br"], marks: [".w"] }, 0, 1],
    ["the frizzball", { pieces: ["rf"] }, 1, 0],
    ["the frizzball and a special", { pieces: ["rf"], marks: ["o."] }, 1, 0],
    ["two frizzballs", { pieces: ["ff"] }, 0, 1],
  ])("makes a move of a swap that moves %s", (_, picture, from, to) => {
    expect(swapWorks(boardFrom(picture), from, to)).toBe(true);
  });

  it.each([
    ["a brick", ["f1"]],
    ["a sleepyhead", ["fz"]],
  ])(
    "makes none of the frizzball swapped with %s, which has no kind for it to take",
    (_, pieces) => {
      expect([
        swapWorks(boardFrom(pieces), 0, 1),
        swapWorks(boardFrom(pieces), 1, 0),
      ]).toEqual([false, false]);
    },
  );
});

describe("legalMoves", () => {
  it("lists each move once, row by row, the swap right before the one down", () => {
    expect(legalMoves(boardFrom(["bbrb", "grgr"]), NO_PART)).toEqual([
      { from: 2, to: 3 },
      { from: 2, to: 6 },
    ]);
  });

  it.each([
    ["picked up", ["..*.", "...."], []],
    ["swapped with", ["...*", "...."], [{ from: 2, to: 6 }]],
  ])(
    "lists no swap of a piece an element's rule holds, %s",
    (_, marks, moves) => {
      const picture = { pieces: ["bbrb", "grgr"], marks };

      expect(legalMoves(boardFrom(picture), DESIGN_HOLDS)).toEqual(moves);
    },
  );

  it("lists every swap of a special that can be picked up", () => {
    const picture = { pieces: ["bgr", "bga"], marks: ["...", ".-."] };

    expect(legalMoves(boardFrom(picture), NO_PART)).toEqual([
      { from: 1, to: 4 },
      { from: 3, to: 4 },
      { from: 4, to: 5 },
    ]);
  });
});

describe("bunchMatesOf", () => {
  it("finds those a swap that works would bunch the fuzzball picked up with", () => {
    const game = gameFrom(["rbb.", "b..."]);

    expect(bunchMatesOf(game, 4, NO_PART)).toEqual([1, 2]);
  });

  it("finds the neighbor where the swap would bunch it, where it stands", () => {
    const game = gameFrom(["brr.", "r..."]);

    expect(bunchMatesOf(game, 0, NO_PART)).toEqual([1, 2, 4]);
  });

  it("finds none for a piece that can't be picked up", () => {
    const game = gameFrom({
      pieces: ["rbb.", "b..."],
      marks: ["....", "*..."],
    });

    expect(bunchMatesOf(game, 4, DESIGN_HOLDS)).toEqual([]);
  });

  it("finds none by a swap with a neighbor that can't be picked up", () => {
    const game = gameFrom({
      pieces: ["rbb.", "b..."],
      marks: ["*...", "...."],
    });

    expect(bunchMatesOf(game, 4, DESIGN_HOLDS)).toEqual([]);
  });

  it("finds each once, where two swaps would bunch it", () => {
    const game = gameFrom(["rbr", "bra", "rab"]);

    expect(bunchMatesOf(game, 4, NO_PART)).toEqual([0, 2, 6]);
  });

  it("answers in the screen's frame, whichever way the board's is turned", () => {
    const game = gameFrom(["brr.", "r..."]);

    const turned = turnFrame(game, 1);

    expect(bunchMatesOf(turned, 0, NO_PART)).toEqual([1, 2, 4]);
  });

  it("leaves the game it is handed as it was", () => {
    const game = gameFrom(["brr.", "r..."]);
    const before = structuredClone(game);

    bunchMatesOf(game, 0, NO_PART);

    expect(game).toEqual(before);
  });
});
