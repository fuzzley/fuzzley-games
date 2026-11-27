import type { Game } from "../rules/board/board";
import { play } from "../rules/move/play";
import type { MoveRecord } from "../rules/move/record";
import { type BoardPicture, gameFrom } from "./board_picture";
import { DESIGN_PARTS, DESIGN_WIND } from "./made_up_rules";
import { type Move, type PlayedOut, playOut } from "./play_out";

/** A board on which swapping 1 and 4 bunches the blues across the top. */
const BLUES_ACROSS: BoardPicture = { pieces: ["bgb", "rbr", "avp"] };

/** The swap that bunches `BLUES_ACROSS`'s blues. */
const BUNCHING_BLUES: Move = { from: 1, to: 4 };

/** Returns a game played out on the made-up elements and wind by a player that makes the same move every time, or none. */
function playedOut(game: Game, move: Move | null): PlayedOut {
  return playOut(game, () => move, DESIGN_PARTS, DESIGN_WIND);
}

/** Returns what a move does on a game, on the made-up elements and wind. */
function recordOf(game: Game, { from, to }: Move): MoveRecord {
  return play(game, from, to, DESIGN_PARTS, DESIGN_WIND).record;
}

describe("playOut", () => {
  it("plays the player's moves until the level is cleared", () => {
    const game = gameFrom(BLUES_ACROSS, {
      goals: [{ what: "gather", kind: "blue", count: 3 }],
    });

    expect(playedOut(game, BUNCHING_BLUES)).toEqual({
      cleared: true,
      used: 1,
      line: [BUNCHING_BLUES],
      records: [recordOf(game, BUNCHING_BLUES)],
    });
  });

  it("plays the player's moves until the level is over, its moves run out", () => {
    const game = gameFrom(BLUES_ACROSS, {
      goals: [{ what: "gather", kind: "blue", count: 30 }],
      movesLeft: 1,
    });

    expect(playedOut(game, BUNCHING_BLUES)).toEqual({
      cleared: false,
      used: 1,
      line: [BUNCHING_BLUES],
      records: [recordOf(game, BUNCHING_BLUES)],
    });
  });

  it("stops where the player makes no move", () => {
    expect(playedOut(gameFrom(BLUES_ACROSS), null)).toEqual({
      cleared: false,
      used: 0,
      line: [],
      records: [],
    });
  });

  it("throws for a move the rules refuse", () => {
    expect(() => playedOut(gameFrom(BLUES_ACROSS), { from: 0, to: 1 })).toThrow(
      "A player made a move the rules refuse, 0 to 1.",
    );
  });

  it("plays no move on a game no longer in play", () => {
    const game: Game = { ...gameFrom(BLUES_ACROSS), outcome: "cleared" };

    expect(playedOut(game, BUNCHING_BLUES)).toEqual({
      cleared: true,
      used: 0,
      line: [],
      records: [],
    });
  });
});
