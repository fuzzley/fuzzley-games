import {
  type BoardPicture,
  type GameOptions,
  gameFrom,
} from "../../testing/board_picture";
import { HOLDS_ONLY } from "../../testing/partial_rules";
import type { Game } from "../board/board";
import { turnFrame } from "../board/orientation";
import type { KindId } from "../catalog/kinds";
import { ELEMENT_RULES, WIND_RULE } from "../elements/element_rules";
import { carefulMove, worthOf } from "./hint";
import { legalMoves } from "./swap";

/** The kinds the boards of the careful player's moves play with. */
const KINDS: readonly KindId[] = ["blue", "red", "amber", "green"];

/** A board whose first move, swapping 1 and 5, bunches the greens across the top, and whose last, swapping 10 and 11, the blues along the bottom. */
const BLUES_LAST: BoardPicture = { pieces: ["gagr", "rgab", "bbrb"] };

/** A goal of gathering 3 blues, which a bunch of blues meets. */
const THREE_BLUES: GameOptions = {
  kinds: KINDS,
  goals: [{ what: "gather", kind: "blue", count: 3 }],
};

/** Returns the careful player's move on a game, on the game's own elements and wind. */
function carefulOn(game: Game): ReturnType<typeof carefulMove> {
  return carefulMove(game, ELEMENT_RULES, WIND_RULE);
}

describe("worthOf", () => {
  it("weighs a cleared game by its moves left", () => {
    const game: Game = {
      ...gameFrom(["bgb"], { movesLeft: 3 }),
      outcome: "cleared",
    };

    expect(worthOf(game)).toBe(10150);
  });

  it("takes off what each goal still needs, by its kind, and nothing for a goal met or passed", () => {
    const game = gameFrom(["rg"], {
      goals: [
        { what: "gather", kind: "red", count: 5 },
        { what: "gather", kind: "green", count: 2 },
        { what: "dust" },
        { what: "brick" },
        { what: "cage" },
        { what: "sleepyhead" },
      ],
      goalsLeft: [2, -1, 3, 1, 2, 1],
    });

    expect(worthOf(game)).toBe(-2 - 3 * 2.5 - 3 - 2 * 5 - 14);
  });

  it("adds for each piece ready to go off: the frizzball, a puffer, a wisp and a dasher", () => {
    const game = gameFrom({ pieces: ["fbbbb"], marks: [".ow-|"] });

    expect(worthOf(game)).toBe(4 + 2.5 + 1.4 + 1.8 + 1.8);
  });

  it("takes off for each burr", () => {
    const game = gameFrom({ pieces: ["bbr"], marks: ["*.*"] });

    expect(worthOf(game)).toBe(-1.6 - 1.6);
  });

  it("takes off for each brick's layers and each sleepyhead's rows to sink while a goal needs them", () => {
    const game = gameFrom(["2z", "bb", "rr"], {
      goals: [{ what: "brick" }, { what: "sleepyhead" }],
    });

    expect(worthOf(game)).toBe(-3 - 14 - 2 * 1.2 - 2 * 1.1);
  });

  it("takes nothing off for a brick or a sleepyhead no goal needs", () => {
    const game = gameFrom(["2z", "bb", "rr"], {
      goals: [{ what: "brick" }, { what: "sleepyhead" }],
      goalsLeft: [0, 0],
    });

    expect(worthOf(game)).toBe(0);
  });

  it("adds its terms in the sketch's order, the goals' before the squares'", () => {
    // Added the other way, 1.4 + 1.8 - 2.5 makes 0.7000000000000002.
    const game = gameFrom(
      { pieces: ["bbr"], marks: ["w-."], dust: ["001"] },
      { goals: [{ what: "dust" }] },
    );

    expect(worthOf(game)).toBe(0.7);
  });
});

describe("carefulMove", () => {
  it("makes the move that clears the level, where one does", () => {
    expect(carefulOn(gameFrom(BLUES_LAST, THREE_BLUES))).toEqual({
      from: 10,
      to: 11,
    });
  });

  it("makes the first of the moves worth the most, by legalMoves()' order", () => {
    // Swapping 2 with 3, or with 6, bunches the blues and clears the level.
    const game = gameFrom(["bbrb", "grbg", "agra"], THREE_BLUES);

    expect([
      legalMoves(game.board, HOLDS_ONLY).slice(0, 2),
      carefulOn(game),
    ]).toEqual([
      [
        { from: 2, to: 3 },
        { from: 2, to: 6 },
      ],
      { from: 2, to: 3 },
    ]);
  });

  it.each(["cleared", "over"] as const)(
    "makes no move on a game %s",
    (outcome) => {
      const game: Game = { ...gameFrom(BLUES_LAST, THREE_BLUES), outcome };

      expect(carefulOn(game)).toBeNull();
    },
  );

  it("makes no move on a board with none", () => {
    const game = gameFrom(["aar", "rgr", "aga"], { kinds: KINDS });

    expect(carefulOn(game)).toBeNull();
  });

  it("makes the sketch's move, picturing what falls in by its two guesses together, not by what falls", () => {
    // Seeing what falls in, it would swap 1 and 2; on its first guess alone
    // 0 and 4, and on its second 1 and 2.
    const game = gameFrom(["bara", "gbaa", "bbag", "rgra"], {
      kinds: KINDS,
      goals: [{ what: "gather", kind: "amber", count: 5 }],
      seed: 16,
    });

    expect(carefulOn(game)).toEqual({ from: 11, to: 15 });
  });

  it("answers in the screen's frame, whichever way the board's is turned", () => {
    // The frame turned, the screen still shows the board as drawn.
    const game = turnFrame(gameFrom(BLUES_LAST, THREE_BLUES), 1);

    expect(carefulOn(game)).toEqual({ from: 10, to: 11 });
  });

  it("leaves the game it is handed as it was", () => {
    const game = gameFrom(BLUES_LAST, THREE_BLUES);
    const before = structuredClone(game);

    carefulOn(game);

    expect(game).toEqual(before);
  });
});
