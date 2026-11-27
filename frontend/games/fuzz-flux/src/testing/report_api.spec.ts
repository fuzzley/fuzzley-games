import { levelSetOf } from "../rules/levels/level";
import { LEVELS, type LevelEntry } from "../rules/levels/levels";
import { DESIGN_SETS, designSet, designText } from "./design_files";
import { MOVE_FIXTURES } from "./move_fixtures";
import {
  CLEARS_ASKED,
  REPORT_API,
  type ReportDeal,
  askOf,
  carefulFiguresOf,
} from "./report_api";

/** Level 1's first deal as the sketch's report plays its players' games on it, dealt moves to spare. */
const OPEN_DEAL: ReportDeal = { level: 1, moves: 99, seed: 1 };

/** A deal of level 1 dealt too few moves for either player to clear it. */
const SHORT_DEAL: ReportDeal = { level: 1, moves: 5, seed: 2 };

/** Returns the seed of the dice the sketch's report rolls a casual game on a deal with, by the deal's seed and the game's place among its games from 0. */
function sketchDice(seed: number, game: number): number {
  return seed * 1000 + game + 17;
}

/** Returns how many times in 100 the sketch's report asked the casual player to clear each level, by the level's id, as its table writes it. */
function askedInTheSketch(): ReadonlyMap<string, number> {
  const rows = designText("sketch/results-table.md")
    .split("\n")
    .slice(2)
    .filter((line) => line.startsWith("|"))
    .map((line) => line.split("|").map((cell) => cell.trim()));
  return new Map(
    rows.map(([, id = "", , , asked = ""]) => [id, parseInt(asked)]),
  );
}

describe("CLEARS_ASKED", () => {
  it("asks of each level of every set of the design's what the sketch's report asked", () => {
    const asked = askedInTheSketch();

    expect(CLEARS_ASKED).toEqual(
      Object.fromEntries(
        DESIGN_SETS.map((set) => [
          set,
          levelSetOf(designSet(set)).levels.map(({ id }) => asked.get(id)),
        ]),
      ),
    );
  });
});

describe("askOf", () => {
  it("asks of each level what its place in its set asks", () => {
    expect(LEVELS.map(askOf)).toEqual(CLEARS_ASKED["warm-up"]);
  });

  it("throws for a level of a set that asks nothing of it", () => {
    const [first] = LEVELS;
    const entry: LevelEntry = {
      ...first!,
      set: { ...first!.set, id: "made-up" },
    };

    expect(() => askOf(entry)).toThrow(
      'Level 1\'s set, "made-up", asks nothing of it.',
    );
  });
});

describe("carefulFiguresOf", () => {
  it("counts each move's waves, the specials its bunches made and the shuffles, leaving the wind's waves out", () => {
    const { twoWaves, pufferMade, shuffle, windTurns } = MOVE_FIXTURES;

    const figures = carefulFiguresOf({
      cleared: false,
      used: 4,
      records: [twoWaves, pufferMade, shuffle, windTurns].map(
        ({ record }) => record,
      ),
    });

    expect(figures).toEqual({
      cleared: false,
      used: 4,
      waves: [2, 1, 1, 1],
      specials: 1,
      shuffles: 1,
    });
  });
});

describe("REPORT_API", () => {
  it("plays the game's levels", () => {
    expect(REPORT_API.levels).toBe(LEVELS);
  });

  it("asks of a level, by its number, what its place in its set asks", () => {
    expect(REPORT_API.asked(9)).toBe(80);
  });

  it("plays the casual player's 16 games on a deal, the dice of each seeded as the sketch's report seeds them", () => {
    const sketch = Array.from({ length: 16 }, (_, game) =>
      REPORT_API.casual(OPEN_DEAL, sketchDice(OPEN_DEAL.seed, game)),
    );

    expect(REPORT_API.casualGames(OPEN_DEAL)).toEqual(sketch);
  });

  it("plays the casual player's game on a deal as the sketch's report plays it first", () => {
    expect(REPORT_API.casual(OPEN_DEAL, sketchDice(1, 0))).toEqual({
      cleared: true,
      used: 6,
    });
  });

  it("plays the careful player's game on a deal as the sketch's report plays it", () => {
    expect(REPORT_API.careful(OPEN_DEAL)).toEqual({
      cleared: true,
      used: 3,
      waves: [3, 1, 3],
      specials: 1,
      shuffles: 0,
    });
  });

  it("deals a deal the moves and the seed it names, as the sketch's report deals them", () => {
    expect([
      REPORT_API.casual(SHORT_DEAL, sketchDice(2, 3)),
      REPORT_API.careful(SHORT_DEAL),
    ]).toEqual([
      { cleared: false, used: 5 },
      {
        cleared: false,
        used: 5,
        waves: [2, 2, 2, 1, 1],
        specials: 2,
        shuffles: 0,
      },
    ]);
  });

  it("proves a deal by the line of the sketch's certificate", () => {
    expect(REPORT_API.proof({ level: 1, moves: 14, seed: 1 })).toEqual([
      { from: 34, to: 35 },
      { from: 15, to: 16 },
    ]);
  });
});
