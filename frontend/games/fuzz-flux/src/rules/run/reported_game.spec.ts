import { itemAt } from "@fz/core/records";
import { BLUE_LINE, PUFFER, SMALL_LEVELS } from "../../testing/small_levels";
import { ELEMENT_RULES, WIND_RULE } from "../elements/element_rules";
import {
  REPORT_TAG,
  readReportedGame,
  reportSummary,
  reportedGameOf,
} from "./reported_game";
import {
  type LevelInPlay,
  type Move,
  levelDealt,
  movePlayed,
} from "./saved_game";

/** The rules the levels are played by: the game's own. */
const RULES = { elements: ELEMENT_RULES, wind: WIND_RULE };

/** Returns a level of the small levels, by its number, in play on a deal with moves made. */
function inPlayAt(
  level: number,
  deal: number,
  ...moves: readonly Move[]
): LevelInPlay {
  let inPlay = levelDealt(itemAt(SMALL_LEVELS, level - 1), deal, RULES);
  for (const move of moves) inPlay = movePlayed(inPlay, move, RULES).inPlay;
  return inPlay;
}

/** Returns the level in play a reported game reads back as, on the small levels. */
function read(value: unknown): LevelInPlay {
  return readReportedGame(value, SMALL_LEVELS, RULES);
}

describe("REPORT_TAG", () => {
  it("is the first version of Fuzz Flux's", () => {
    expect(REPORT_TAG).toBe("ff1");
  });
});

describe("reportedGameOf", () => {
  it("keeps the level by its id, the deal's seed and each move as its two squares", () => {
    expect(reportedGameOf(inPlayAt(3, 2, BLUE_LINE))).toEqual({
      level: "3",
      deal: 2,
      moves: [[12, 13]],
    });
  });
});

describe("readReportedGame", () => {
  it("replays the moves kept, to the game they left", () => {
    const inPlay = inPlayAt(3, 2, BLUE_LINE);

    expect(read(reportedGameOf(inPlay))).toEqual(inPlay);
  });

  it("replays a level its moves cleared, to its end", () => {
    const cleared = inPlayAt(1, 1, BLUE_LINE);

    expect(read(reportedGameOf(cleared))).toEqual(cleared);
  });

  it("replays a level its moves ran out of moves, to its end", () => {
    const over = read({ level: "2", deal: 3, moves: [[12, 13]] });

    expect(over.game.outcome).toBe("over");
  });

  it("replays a special set off where it stands", () => {
    const setOff = { from: PUFFER, to: PUFFER };

    expect(read({ level: "4", deal: 1, moves: [[0, 0]] })).toEqual(
      inPlayAt(4, 1, setOff),
    );
  });

  it.each([
    ["isn't a record", [3, 1, []], "This build can't read the game state."],
    [
      "names a level the build doesn't have",
      { level: "99", deal: 1, moves: [] },
      "This build can't read level in the game state.",
    ],
    [
      "has a deal that isn't one",
      { level: "3", deal: -1, moves: [] },
      "This build can't read deal in the game state.",
    ],
    [
      "has a deal not the level's own",
      { level: "3", deal: 7, moves: [] },
      "This build can't read deal in the game state.",
    ],
    [
      "has moves that aren't a list",
      { level: "3", deal: 1, moves: "12-13" },
      "This build can't read moves in the game state.",
    ],
    [
      "has a move that isn't a list",
      { level: "3", deal: 1, moves: [12, 13] },
      "This build can't read move 1 in the game state.",
    ],
    [
      "has a move that isn't two squares",
      { level: "3", deal: 1, moves: [[12, 13], [12]] },
      "This build can't read move 2 in the game state.",
    ],
    [
      "has a move off the board",
      { level: "3", deal: 1, moves: [[24, 25]] },
      "This build can't read move 1 in the game state.",
    ],
    [
      "has a move the rules refuse",
      { level: "3", deal: 1, moves: [[0, 1]] },
      "Move 1 in the game state isn't a move the rules allow.",
    ],
    [
      "has a move after the level's end",
      {
        level: "1",
        deal: 1,
        moves: [
          [12, 13],
          [12, 13],
        ],
      },
      "Move 2 in the game state isn't a move the rules allow.",
    ],
    [
      "has a part the build doesn't know",
      { level: "3", deal: 1, moves: [], score: 10 },
      "The game state has a part this build doesn't know: score.",
    ],
  ])("refuses a state that %s, saying why", (_, value, why) => {
    expect(() => read(value)).toThrow(why);
  });
});

describe("reportSummary", () => {
  it("names the level, its deal, the moves made and left, and how it stands", () => {
    expect(reportSummary(inPlayAt(3, 2, BLUE_LINE))).toBe(
      "Level 3: Show me · deal 2 · 1 move made · 5 moves left · In play",
    );
  });

  it("says a cleared level is cleared", () => {
    expect(reportSummary(inPlayAt(1, 1, BLUE_LINE))).toBe(
      "Level 1: Quick clear · deal 1 · 1 move made · 4 moves left · Cleared",
    );
  });

  it("says a level out of moves is out of moves", () => {
    expect(
      reportSummary(read({ level: "2", deal: 3, moves: [[12, 13]] })),
    ).toBe(
      "Level 2: Last move · deal 3 · 1 move made · 0 moves left · Out of moves",
    );
  });
});
