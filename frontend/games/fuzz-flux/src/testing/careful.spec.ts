import type { Game } from "../rules/board/board";
import type { KindId } from "../rules/catalog/kinds";
import { carefulMove } from "../rules/move/hint";
import { type Played, play } from "../rules/move/play";
import { type BoardPicture, gameFrom } from "./board_picture";
import { playCarefully } from "./careful";
import { DESIGN_PARTS, DESIGN_WIND } from "./made_up_rules";
import type { Move, PlayedOut } from "./play_out";

/** A board whose first move, swapping 1 and 5, bunches the greens across the top, and whose last, swapping 10 and 11, the blues along the bottom. */
const BLUES_LAST: BoardPicture = { pieces: ["gagr", "rgab", "bbrb"] };

/** The swap that bunches `BLUES_LAST`'s blues, the careful player's first move on it. */
const BLUES_ALONG: Move = { from: 10, to: 11 };

/** The kinds the boards of the careful player's games play with. */
const KINDS: readonly KindId[] = ["blue", "red", "amber", "green"];

/** Returns a game played to its end by the careful player, on the made-up elements and wind. */
function playedOn(game: Game): PlayedOut {
  return playCarefully(game, DESIGN_PARTS, DESIGN_WIND);
}

/** Returns the careful player's move on a game, on the made-up elements and wind. */
function carefulOn(game: Game): Move | null {
  return carefulMove(game, DESIGN_PARTS, DESIGN_WIND);
}

/** Returns a move played on a game, on the made-up elements and wind. */
function playedMove(game: Game, { from, to }: Move): Played {
  return play(game, from, to, DESIGN_PARTS, DESIGN_WIND);
}

describe("playCarefully", () => {
  it("plays the careful player's move until the level is cleared", () => {
    const game = gameFrom(BLUES_LAST, {
      kinds: KINDS,
      goals: [{ what: "gather", kind: "blue", count: 3 }],
    });

    expect(playedOn(game)).toEqual({
      cleared: true,
      used: 1,
      line: [BLUES_ALONG],
      records: [playedMove(game, BLUES_ALONG).record],
    });
  });

  it("plays the careful player's move each time until the level is over", () => {
    const game = gameFrom(BLUES_LAST, {
      kinds: KINDS,
      goals: [{ what: "gather", kind: "blue", count: 30 }],
      movesLeft: 2,
    });
    const first = playedMove(game, BLUES_ALONG);
    const second = { from: 9, to: 10 };

    expect([carefulOn(first.game), playedOn(game)]).toEqual([
      second,
      {
        cleared: false,
        used: 2,
        line: [BLUES_ALONG, second],
        records: [first.record, playedMove(first.game, second).record],
      },
    ]);
  });

  it("stops on a board with no move", () => {
    const game = gameFrom(["aar", "rgr", "aga"], { kinds: KINDS });

    expect(playedOn(game)).toEqual({
      cleared: false,
      used: 0,
      line: [],
      records: [],
    });
  });
});
