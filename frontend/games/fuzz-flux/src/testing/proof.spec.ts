import type { Game } from "../rules/board/board";
import { turnFrame } from "../rules/board/orientation";
import type { KindId } from "../rules/catalog/kinds";
import { ELEMENT_RULES, WIND_RULE } from "../rules/elements/element_rules";
import { type BoardPicture, type GameOptions, gameFrom } from "./board_picture";
import type { Move } from "./play_out";
import { proofOf } from "./proof";

/** The kinds the proof's boards play with. */
const KINDS: readonly KindId[] = ["blue", "red", "amber", "green"];

/** A board whose first move, swapping 1 and 5, bunches the greens across the top, and whose last, swapping 10 and 11, the blues along the bottom. */
const BLUES_LAST: BoardPicture = { pieces: ["gagr", "rgab", "bbrb"] };

/** A goal of gathering 3 blues, which a bunch of blues meets. */
const THREE_BLUES: GameOptions = {
  kinds: KINDS,
  goals: [{ what: "gather", kind: "blue", count: 3 }],
};

/** The line the proof finds on `fifteenBlues()`' deal, given 3 moves or more. */
const FIFTEEN_BLUES_LINE: readonly Move[] = [
  { from: 28, to: 29 },
  { from: 27, to: 28 },
  { from: 10, to: 16 },
];

/**
 * Returns a deal on which the proof clears a goal of 15 blues in 3 moves,
 * dealt so many moves: given 4, keeping 9 or 11 games a move, or the 10
 * worth the least, it would clear it by another line.
 */
function fifteenBlues(movesLeft: number): Game {
  return gameFrom(
    {
      pieces: ["ragbga", "rbagaa", "babrag", "rbrggb", "gaggbg", "brgaag"],
    },
    {
      kinds: KINDS,
      goals: [{ what: "gather", kind: "blue", count: 15 }],
      movesLeft,
      seed: 177,
    },
  );
}

/** Returns the proof's line on a game, on the game's own elements and wind. */
function proofOn(game: Game): readonly Move[] | null {
  return proofOf(game, ELEMENT_RULES, WIND_RULE);
}

describe("proofOf", () => {
  it("finds a line of one move where one clears the level", () => {
    expect(proofOn(gameFrom(BLUES_LAST, THREE_BLUES))).toEqual([
      { from: 10, to: 11 },
    ]);
  });

  it("finds a longer line by the 10 games worth the most it keeps after each move", () => {
    expect(proofOn(fifteenBlues(4))).toEqual(FIFTEEN_BLUES_LINE);
  });

  it("finds a line that takes every move the game has left", () => {
    expect([proofOn(fifteenBlues(3)), proofOn(fifteenBlues(2))]).toEqual([
      FIFTEEN_BLUES_LINE,
      null,
    ]);
  });

  it("finds none where no line clears the level within its moves left", () => {
    const game = gameFrom(BLUES_LAST, {
      ...THREE_BLUES,
      goals: [{ what: "gather", kind: "blue", count: 30 }],
      movesLeft: 2,
    });

    expect(proofOn(game)).toBeNull();
  });

  it.each(["cleared", "over"] as const)(
    "finds none on a game %s",
    (outcome) => {
      const game: Game = { ...gameFrom(BLUES_LAST, THREE_BLUES), outcome };

      expect(proofOn(game)).toBeNull();
    },
  );

  it("answers in the screen's frame, whichever way the board's is turned", () => {
    const game = turnFrame(gameFrom(BLUES_LAST, THREE_BLUES), 1);

    expect(proofOn(game)).toEqual([{ from: 10, to: 11 }]);
  });
});
