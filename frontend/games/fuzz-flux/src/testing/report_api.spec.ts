import { LEVELS } from "../rules/levels/levels";
import { MOVE_FIXTURES } from "./move_fixtures";
import { REPORT_API, type ReportDeal, carefulFiguresOf } from "./report_api";

/** Level 1's first deal as the sketch's report plays its players' games on it, dealt moves to spare. */
const OPEN_DEAL: ReportDeal = { level: 1, moves: 99, seed: 1 };

/** A deal of level 1 dealt too few moves for either player to clear it. */
const SHORT_DEAL: ReportDeal = { level: 1, moves: 5, seed: 2 };

/** Returns the seed of the dice the sketch's report rolls a casual game on a deal with, by the deal's seed and the game's place among its games from 0. */
function sketchDice(seed: number, game: number): number {
  return seed * 1000 + game + 17;
}

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
