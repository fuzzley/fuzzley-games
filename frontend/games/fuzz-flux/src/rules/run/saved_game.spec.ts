import { itemAt } from "@fz/core/records";
import {
  BLUE_LINE,
  PUFFER,
  REFUSED,
  SMALL_LEVELS,
} from "../../testing/small_levels";
import { ELEMENT_RULES, WIND_RULE } from "../elements/element_rules";
import {
  type LevelInPlay,
  type Move,
  levelDealt,
  movePlayed,
  readSavedGame,
  savedGameOf,
} from "./saved_game";

/** The rules the levels are played by: the game's own. */
const RULES = { elements: ELEMENT_RULES, wind: WIND_RULE };

/** Returns a level of the small levels, by its number, in play on its first deal with moves made. */
function inPlayAt(level: number, ...moves: readonly Move[]): LevelInPlay {
  let inPlay = levelDealt(itemAt(SMALL_LEVELS, level - 1), 1, RULES);
  for (const move of moves) inPlay = movePlayed(inPlay, move, RULES).inPlay;
  return inPlay;
}

/** Returns what a saved game reads back as, on the small levels. */
function read(value: unknown): LevelInPlay | null {
  return readSavedGame(value, SMALL_LEVELS, RULES);
}

describe("levelDealt", () => {
  it("deals a level on a seed, no move made", () => {
    expect(inPlayAt(3)).toMatchObject({ deal: 1, moves: [] });
  });
});

describe("movePlayed", () => {
  it("keeps a move made", () => {
    expect(inPlayAt(3, BLUE_LINE).moves).toEqual([BLUE_LINE]);
  });

  it("leaves the level in play as it was for a move the rules refuse", () => {
    const dealt = inPlayAt(3);

    expect(movePlayed(dealt, REFUSED, RULES)).toMatchObject({
      inPlay: dealt,
      record: { swap: { refused: true } },
    });
  });
});

describe("savedGameOf", () => {
  it("keeps the level by its id, the deal's seed and each move as its two squares", () => {
    expect(savedGameOf(inPlayAt(3, BLUE_LINE))).toEqual({
      level: "3",
      deal: 1,
      moves: [[12, 13]],
    });
  });
});

describe("readSavedGame", () => {
  it("replays the moves kept, to the game they left", () => {
    const inPlay = inPlayAt(3, BLUE_LINE);

    expect(read(savedGameOf(inPlay))).toEqual(inPlay);
  });

  it("takes up a level begun with no move made", () => {
    expect(read({ level: "2", deal: 1, moves: [] })).toEqual(inPlayAt(2));
  });

  it("replays a special set off where it stands", () => {
    const setOff = { from: PUFFER, to: PUFFER };

    expect(read({ level: "4", deal: 1, moves: [[0, 0]] })?.moves).toEqual([
      setOff,
    ]);
  });

  it.each([
    ["isn't a record", [3, 1, []]],
    [
      "names a level the game no longer has",
      { level: "99", deal: 1, moves: [] },
    ],
    ["names its level by number", { level: 3, deal: 1, moves: [] }],
    ["has a deal that isn't one", { level: "3", deal: -1, moves: [] }],
    ["has a deal not the level's own", { level: "3", deal: 7, moves: [] }],
    ["has moves that aren't a list", { level: "3", deal: 1, moves: "12-13" }],
    ["has a move that isn't a list", { level: "3", deal: 1, moves: [12, 13] }],
    ["has a square that isn't one", { level: "3", deal: 1, moves: [[-1, 0]] }],
    [
      "has a move that isn't two squares",
      { level: "3", deal: 1, moves: [[12]] },
    ],
    ["has a move off the board", { level: "3", deal: 1, moves: [[24, 25]] }],
    ["has a move the rules refuse", { level: "3", deal: 1, moves: [[0, 1]] }],
    [
      "has moves that end the level",
      { level: "1", deal: 1, moves: [[12, 13]] },
    ],
  ])("drops a saved game that %s", (_, saved) => {
    expect(read(saved)).toBeNull();
  });
});
