import { itemAt } from "@fz/core/records";
import type { Game } from "../rules/board/board";
import { turnFrame } from "../rules/board/orientation";
import { play } from "../rules/move/play";
import { legalMoves } from "../rules/move/swap";
import { type BoardPicture, type GameOptions, gameFrom } from "./board_picture";
import { casualMove, lookOf, playCasually } from "./casual";
import type { Dice } from "./dice";
import { DESIGN_PARTS, DESIGN_WIND } from "./made_up_rules";
import type { Move } from "./play_out";

/** A board on which swapping 1 and 4 bunches the blues across the top, and no other move bunches anything. */
const BLUES_ACROSS: BoardPicture = { pieces: ["bgb", "rbr", "avp"] };

/** The swap that bunches `BLUES_ACROSS`'s blues. */
const BUNCHING_BLUES: Move = { from: 1, to: 4 };

/** A board on which swapping 0 and 1 bunches 3 greens across the top, and swapping 1 and 5 bunches 4, which looks better; no other move bunches anything. */
const FOUR_GREENS: BoardPicture = { pieces: ["gbgg", "rgra", "avpv"] };

/** A board on which swapping 0 and 1, 1 and 2, or 1 and 4 bunches 3 greens, each move looking as good as the others. */
const ALIKE: BoardPicture = { pieces: ["gbg", "rgr", "agv"] };

/** A goal of gathering 3 blues, which a bunch of blues meets. */
const THREE_BLUES: GameOptions = {
  goals: [{ what: "gather", kind: "blue", count: 3 }],
};

/** Returns dice that roll the numbers given, in turn. */
function loadedDice(rolls: readonly number[]): Dice {
  let rolled = 0;
  return () => itemAt(rolls, rolled++);
}

/** Returns how a move looks on a game of a board drawn as a picture. */
function lookOn(
  picture: BoardPicture | readonly string[],
  move: Move,
  options: GameOptions = {},
): number {
  return lookOf(gameFrom(picture, options), move);
}

/** Returns the casual player's move on a game, on the made-up elements, rolling the dice given. */
function casualOn(game: Game, rolls: readonly number[]): Move | null {
  return casualMove(game, loadedDice(rolls), DESIGN_PARTS);
}

describe("lookOf", () => {
  it("adds 1 for each fuzzball a bunch takes in", () => {
    expect(lookOn(BLUES_ACROSS, BUNCHING_BLUES)).toBe(3);
  });

  it("adds 3 for a bunch that makes a special", () => {
    expect(lookOn(["bgbb", "rbrg", "avpa"], { from: 1, to: 5 })).toBe(4 + 3);
  });

  it("adds 4 for each piece swapped that goes off, a special or the frizzball", () => {
    const picture = { pieces: ["bgf", "rar"], marks: ["-o.", "..."] };

    expect([
      lookOn(picture, { from: 0, to: 3 }),
      lookOn(picture, { from: 0, to: 1 }),
      lookOn(picture, { from: 2, to: 5 }),
    ]).toEqual([4, 4 + 4, 4]);
  });

  it("adds 1.5 for a bunch of a kind a goal still gathers", () => {
    const looks = [
      lookOn(BLUES_ACROSS, BUNCHING_BLUES, THREE_BLUES),
      lookOn(BLUES_ACROSS, BUNCHING_BLUES, { ...THREE_BLUES, goalsLeft: [0] }),
      lookOn(BLUES_ACROSS, BUNCHING_BLUES, {
        goals: [{ what: "gather", kind: "red", count: 3 }],
      }),
    ];

    expect(looks).toEqual([3 + 1.5, 3, 3]);
  });

  it("adds 1 for each square of a bunch with dust on it, whatever its layers", () => {
    const picture = { ...BLUES_ACROSS, dust: ["120", "000", "000"] };

    expect(lookOn(picture, BUNCHING_BLUES)).toBe(3 + 1 + 1);
  });

  it("adds 2 for each caged fuzzball of a bunch", () => {
    expect(lookOn(["Bgb", "rbr", "avp"], BUNCHING_BLUES)).toBe(3 + 2);
  });

  it("reads each square of a bunch as the swap leaves it", () => {
    // The swap lifts the caged blue into the bunch.
    expect(lookOn(["bgb", "rBr", "avp"], BUNCHING_BLUES)).toBe(3 + 2);
  });

  it("adds 1.5 for each sleepyhead above each square of a bunch, however far", () => {
    const picture = ["z_z", "zrg", "bgb", "rbr", "avp"];

    expect(lookOn(picture, { from: 7, to: 10 })).toBe(3 + 1.5 * 3);
  });

  it("adds 0.7 for each brick or burred fuzzball beside each square of a bunch", () => {
    const picture = {
      pieces: ["bgb1", "rbrg", "avpa"],
      marks: ["....", "..*.", "...."],
    };

    expect(lookOn(picture, { from: 1, to: 5 })).toBe(3 + 0.7 + 0.7);
  });

  it("takes the last square of a row for beside the first of the next, as the sketch does", () => {
    const picture = ["ra1", "bgb", "rbr", "avp"];

    expect(lookOn(picture, { from: 4, to: 7 })).toBe(3 + 0.7 + 0.7);
  });

  it("adds its terms one at a time, in the sketch's order", () => {
    // Added one at a time, the three burrs beside the bunch make
    // 5.1000000000000005; added as 3 + 3 * 0.7, they would make 5.1.
    const picture = { ...BLUES_ACROSS, marks: ["...", "*.*", "..."] };

    expect(lookOn(picture, BUNCHING_BLUES)).toBe(5.1000000000000005);
  });
});

describe("casualMove", () => {
  it("makes the move that looks best on a roll under 65", () => {
    expect(casualOn(gameFrom(FOUR_GREENS), [64, 0, 0])).toEqual({
      from: 1,
      to: 5,
    });
  });

  it("makes the legal move a second roll draws on a roll of 65 or more", () => {
    const game = gameFrom(FOUR_GREENS);

    expect([
      legalMoves(game.board, DESIGN_PARTS),
      casualOn(game, [65, 0]),
    ]).toEqual([
      [
        { from: 0, to: 1 },
        { from: 1, to: 5 },
      ],
      { from: 0, to: 1 },
    ]);
  });

  it("makes the first of the moves that look best, where their nudges tie", () => {
    expect(casualOn(gameFrom(ALIKE), [0, 0, 0, 0])).toEqual({
      from: 0,
      to: 1,
    });
  });

  it("lets the nudges choose between moves that look alike", () => {
    expect(casualOn(gameFrom(ALIKE), [0, 0, 1, 0])).toEqual({
      from: 1,
      to: 2,
    });
  });

  it("nudges a look by under half a point", () => {
    // Swapping 1 with 5 bunches 3 blues, and 6 with 7 bunches 3 ambers by
    // a brick, which looks 0.7 better.
    const game = gameFrom(["bgba", "rbar", "vp1a"]);

    expect(casualOn(game, [0, 99, 0])).toEqual({ from: 6, to: 7 });
  });

  it.each(["cleared", "over"] as const)(
    "makes no move on a game %s",
    (outcome) => {
      const game: Game = { ...gameFrom(BLUES_ACROSS), outcome };

      expect(casualOn(game, [0, 0])).toBeNull();
    },
  );

  it("makes no move on a board with none", () => {
    expect(casualOn(gameFrom(["bgb", "rar", "gbg"]), [0, 0])).toBeNull();
  });

  it("answers in the screen's frame, whichever way the board's is turned", () => {
    // The same swap, picked up from below, which comes first in the turned
    // frame's order.
    const game = turnFrame(gameFrom(BLUES_ACROSS), 1);

    expect(casualOn(game, [0, 0])).toEqual({ from: 4, to: 1 });
  });
});

describe("playCasually", () => {
  it("plays the casual player's moves until the level is cleared", () => {
    const game = gameFrom(BLUES_ACROSS, THREE_BLUES);

    const played = playCasually(
      game,
      loadedDice([0, 0]),
      DESIGN_PARTS,
      DESIGN_WIND,
    );

    expect(played).toEqual({
      cleared: true,
      used: 1,
      line: [BUNCHING_BLUES],
      records: [play(game, 1, 4, DESIGN_PARTS, DESIGN_WIND).record],
    });
  });
});
