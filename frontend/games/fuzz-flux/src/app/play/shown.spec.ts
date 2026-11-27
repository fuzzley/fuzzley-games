import { itemAt } from "@fz/core/records";
import type { Goal } from "../../rules/catalog/goals";
import type { LevelWind } from "../../rules/levels/level";
import type { LevelEntry } from "../../rules/levels/levels";
import { turnFrame } from "../../rules/board/orientation";
import { gameFrom } from "../../testing/board_picture";
import { SMALL_LEVELS } from "../../testing/small_levels";
import { goalsOf, gridOf, windOf } from "./shown";

/** The first of the small levels, whose stars ask for 0, 2 and 4 moves to spare. */
const LEVEL = itemAt(SMALL_LEVELS, 0);

/** A goal of blue fuzzballs. */
const BLUE: Goal = { what: "gather", kind: "blue", count: 10 };

/** Returns the first of the small levels with a wind of its own. */
function windy(wind: LevelWind): LevelEntry {
  return { ...LEVEL, data: { ...LEVEL.data, wind } };
}

describe("gridOf", () => {
  it("shows the board in the screen's frame, however the wind has turned the board's own", () => {
    const game = gameFrom(["rgb", "agr"]);

    expect(gridOf(turnFrame(game, 1))).toEqual(gridOf(game));
  });

  it("shows a gap as no square, and dust under the piece of a square", () => {
    const game = gameFrom({ pieces: ["r_"], dust: ["10"] });

    expect(gridOf(game).squares).toEqual([
      { piece: itemAt(game.board.pieces, 0), dust: 1 },
      null,
    ]);
  });
});

describe("goalsOf", () => {
  it("shows a goal met once it asks for nothing more, never below none", () => {
    expect(goalsOf([BLUE, BLUE], [3, -2])).toEqual([
      { goal: BLUE, left: 3, met: false },
      { goal: BLUE, left: 0, met: true },
    ]);
  });
});

describe("windOf", () => {
  it("shows no wind on a level with none", () => {
    expect(windOf(LEVEL, gameFrom(["rgb"]))).toBeNull();
  });

  it("shows the way it blows and the moves until it turns", () => {
    const level = windy({ blows: "down", turns: { every: 3, quarters: 1 } });
    const game = gameFrom(["rgb"], {
      wind: { every: 3, quarters: 1, wait: 2 },
    });

    expect(windOf(level, turnFrame(game, 1))).toEqual({
      blows: "right",
      turnsIn: 2,
    });
  });

  it("shows no count for a wind that never turns", () => {
    const level = windy({ blows: "down", turns: null });

    expect(windOf(level, gameFrom(["rgb"]))).toEqual({
      blows: "down",
      turnsIn: null,
    });
  });
});
