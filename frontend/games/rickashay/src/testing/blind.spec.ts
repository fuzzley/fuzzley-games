import { AIM_COUNT } from "@fz/brick-wall/rules/aims";
import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import { DANGER_ROW } from "@fz/brick-wall/rules/wall";
import { CARELESS_ROUNDS } from "@fz/brick-wall/testing/careless";
import { replayLine } from "@fz/brick-wall/testing/solver";
import { createRandom } from "@fz/core/random";
import { WALL_LEGEND } from "../rules/levels/legend";
import { FLIGHT_RULES, type FlightRules } from "../rules/tuning";
import { blindClears, playBlind } from "./blind";
import { type RoundPlay, linePlayOf } from "./line_play";

/** Returns how the game plays a level of a wall drawn as a picture on a field 11 deep, its lowest row opening on row 5, by the rules handed in. */
function playOf(
  picture: readonly string[],
  rules: FlightRules = FLIGHT_RULES,
): RoundPlay {
  return linePlayOf(wallFrom(picture, WALL_LEGEND), 11, rules);
}

/** A level of a row of plain bricks, which aims drawn blind clear in 3 of the 20 games from seed 1000 and 1 of those from seed 0. */
const A_ROW = playOf(["ooooooooo"]);

/** A level of steel alone, which needs nothing broken. */
const STEEL = playOf(["#........"]);

/** A level of a plain brick, flown by rules under which a fuzzball yawns a unit out, so no aim reaches it. */
const UNREACHED = playOf(["o........"], { ...FLIGHT_RULES, bored: 1 });

/** A level of a plain brick waiting so far over the ceiling that the wall jumps every round the careless player plays. */
const OUT_OF_SIGHT = playOf([
  "o........",
  ...Array.from({ length: 500 }, () => "........."),
]);

describe("playBlind", () => {
  it("plays each round an aim its seed draws from every aim", () => {
    const random = createRandom(4);

    const { line } = playBlind(A_ROW, 4);

    expect(line).toEqual(line.map(() => Math.floor(random() * AIM_COUNT)));
  });

  it("tells how the line it played plays the level", () => {
    const { line, ...played } = playBlind(A_ROW, 4);

    expect(replayLine(A_ROW, line)).toEqual(played);
  });

  it("clears a level that needs nothing broken in its first round", () => {
    expect(playBlind(STEEL, 1)).toMatchObject({
      cleared: true,
      rounds: 1,
      jumps: 0,
    });
  });

  it("loses a level whose brick no aim reaches once it comes down to the danger row", () => {
    expect(playBlind(UNREACHED, 1)).toMatchObject({
      cleared: false,
      rounds: 5,
      jumps: 0,
      leastRow: DANGER_ROW,
    });
  });

  it("gives up once it has played the careless player's most rounds", () => {
    const { line, ...played } = playBlind(OUT_OF_SIGHT, 1);

    expect(played).toMatchObject({
      cleared: false,
      rounds: CARELESS_ROUNDS,
      jumps: CARELESS_ROUNDS,
    });
    expect(line).toHaveLength(CARELESS_ROUNDS);
  });
});

describe("blindClears", () => {
  it("counts in 100 the games it clears of the seeds from the first it is handed on", () => {
    expect([blindClears(A_ROW, 1000), blindClears(A_ROW, 0)]).toEqual([15, 5]);
  });

  it("counts every game of a level that needs nothing broken, and none of one no aim can clear", () => {
    expect([blindClears(STEEL, 1000), blindClears(UNREACHED, 1000)]).toEqual([
      100, 0,
    ]);
  });
});
