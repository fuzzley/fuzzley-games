import { DEPTHS } from "@fz/brick-wall/rules/field";
import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import {
  FLOOR_SEEDS,
  SEED_STRIDE,
  floorGames,
} from "@fz/brick-wall/testing/holders";
import { solveLine } from "@fz/brick-wall/testing/solver";
import { WALL_LEGEND } from "../rules/levels/legend";
import { LEVELS } from "../rules/levels/levels";
import { FLIGHT_RULES } from "../rules/tuning";
import { BLIND_CEILING, blindClears } from "./blind";
import { CARELESS_FLOORS, levelPlayOf, linePlayOf } from "./line_play";
import { REPORT_API, figuresOfPlay, wallFiguresOf } from "./report_api";
import { ralliesOf } from "./rally_mark";
import { LEAST_SWEET_SPOT, sweetSpotOf } from "./sweet_spot";

/** The first level, First bounce. */
const FIRST_BOUNCE = LEVELS[0]!;

/** A level of a row of plain bricks on a field 11 deep, which the solver clears in 3 rounds. */
const A_ROW = linePlayOf(wallFrom(["ooooooooo"], WALL_LEGEND), 11);

/** A level of a plain brick, flown by rules under which a fuzzball yawns a unit out, so no line clears it. */
const UNREACHED = linePlayOf(wallFrom(["o........"], WALL_LEGEND), 11, {
  ...FLIGHT_RULES,
  bored: 1,
});

describe("wallFiguresOf", () => {
  it.each([
    [1, { rows: 17, bricks: 64, hits: 64 }],
    [4, { rows: 15, bricks: 54, hits: 84 }],
    [7, { rows: 15, bricks: 30, hits: 60 }],
  ])(
    "counts level %i's rows, the bricks it needs broken and their hits, as the design's table does",
    (number, figures) => {
      expect(wallFiguresOf(LEVELS[number - 1]!)).toEqual(figures);
    },
  );
});

describe("figuresOfPlay", () => {
  it("gives the rounds of the solver's line and the level's sweet spot", () => {
    const { rounds, sweetSpot } = figuresOfPlay(A_ROW, 1000, 1);

    expect({ rounds, sweetSpot }).toEqual({
      rounds: solveLine(A_ROW)!.line.length,
      sweetSpot: sweetSpotOf(A_ROW),
    });
  });

  it("gives no rounds where the solver finds no line", () => {
    expect(figuresOfPlay(UNREACHED, 1000, 1).rounds).toBeNull();
  });

  it("counts the games aims drawn blind clear from the seeds handed in", () => {
    expect(figuresOfPlay(A_ROW, 1000, 20).blind).toBe(
      (blindClears(A_ROW, 1000) * 20) / 100,
    );
  });

  it("plays a level's floor games from its own seeds, counting those cleared, their rounds and each game's longest rally", () => {
    const play = levelPlayOf(FIRST_BOUNCE, 13);
    const games = floorGames(levelPlayOf, FIRST_BOUNCE, 13);
    const won = games.filter(({ cleared }) => cleared);

    const figures = figuresOfPlay(
      play,
      FIRST_BOUNCE.number * SEED_STRIDE,
      FLOOR_SEEDS,
    );

    expect(figures).toMatchObject({
      cleared: won.length,
      clearedRounds: won.reduce((sum, { rounds }) => sum + rounds, 0),
      bests: games.map(({ line }) => Math.max(...ralliesOf(play, line))),
    });
  });
});

describe("REPORT_API", () => {
  it("plays the game's levels on every depth, held to their floors, the blind ceiling and the least sweet spot", () => {
    const { levels, depths, floors, blindCeiling, leastSweetSpot } = REPORT_API;

    expect({ levels, depths, floors, blindCeiling, leastSweetSpot }).toEqual({
      levels: LEVELS,
      depths: DEPTHS,
      floors: CARELESS_FLOORS,
      blindCeiling: BLIND_CEILING,
      leastSweetSpot: LEAST_SWEET_SPOT,
    });
  });

  it("gives a level's wall by its number", () => {
    expect(REPORT_API.wallOf(1)).toEqual(wallFiguresOf(FIRST_BOUNCE));
  });

  it("plays a level by its number on a depth, from the first seed handed in", () => {
    const figures = REPORT_API.figuresOf(1, 22, 7, 2);

    expect(figures).toEqual(figuresOfPlay(levelPlayOf(FIRST_BOUNCE, 22), 7, 2));
  });
});
