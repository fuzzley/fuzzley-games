import { RADIUS } from "@fz/brick-wall/rules/field";
import { multiplierAt } from "@fz/core/math";
import {
  EYE,
  FLIGHT_RULES,
  RALLY_MARKS,
  RALLY_STEPS,
  STAND_OFF,
  STRIKE_HITS,
  STRIKE_POINTS,
  bounceRally,
} from "./tuning";

/**
 * Returns what a flight's strikes score at a rally, before its floor
 * bounces, as "The feel, in numbers" adds them up: the round's scoring is
 * its own module's, and this holds the constants to the design's sums.
 */
function rallyPoints(rally: number): number {
  let points = 0;
  for (let strike = 1; strike <= rally; strike++) {
    points += STRIKE_POINTS * multiplierAt(strike, RALLY_STEPS);
  }
  return points;
}

// The numbers are the game's to tune; these hold the design's examples and
// what tuning must not break.
describe("the tuning", () => {
  it('scores a rally of 7, 33 and 79 by the rally\'s steps as "The feel, in numbers" does', () => {
    expect([7, 33, 79].map(rallyPoints)).toEqual([100, 950, 3140]);
  });

  it("lists the rally's steps from the highest", () => {
    const froms = RALLY_STEPS.map(({ from }) => from);
    const times = RALLY_STEPS.map(({ times: each }) => each);

    expect({ froms, times }).toEqual({
      froms: [...froms].sort((a, b) => b - a),
      times: [...times].sort((a, b) => b - a),
    });
  });

  // "At a rally of 10 its strands lift, at 25 they stand out, and at 45 they
  // stand on end, each step at the moment a floor bounce is earned."
  it("marks the rallies of the first three floor bounces, untuned", () => {
    expect(
      [1, 2, 3].map((bounce) => bounceRally(bounce, FLIGHT_RULES)),
    ).toEqual(RALLY_MARKS);
  });

  it("steps the rally up at each mark", () => {
    const froms = RALLY_STEPS.map(({ from }) => from);

    expect(froms.filter((from) => from >= RALLY_MARKS[0]).reverse()).toEqual(
      RALLY_MARKS,
    );
  });

  it("stands a 45° face's line off by the radius times the square root of 2", () => {
    expect(STAND_OFF).toBe(Math.sqrt(2) * RADIUS);
  });

  it("keeps a portal's eye a radius in from its cell's edges", () => {
    expect((1 - EYE) / 2).toBe(RADIUS);
  });

  it("strikes harder with a hot shot than with a plain one", () => {
    expect(FLIGHT_RULES.hotHits).toBeGreaterThan(STRIKE_HITS);
  });

  it("leaves a hot shot holding no more floor bounces than a fuzzball can", () => {
    expect(FLIGHT_RULES.hotBounces).toBeLessThanOrEqual(
      FLIGHT_RULES.mostBounces,
    );
  });
});

describe("FLIGHT_RULES", () => {
  it("hands the rules each number the debug menu may retune, as the design sets it", () => {
    expect(FLIGHT_RULES).toEqual({
      bored: 60,
      longest: 4000,
      stillTurns: 8,
      firstBounce: 10,
      bounceStep: 5,
      mostBounces: 3,
      hotHits: 2,
      hotBounces: 1,
      hatchHolds: 3,
      boltTurns: 4,
      guideTurns: 3,
      guidePast: 1.5,
    });
  });
});

describe("bounceRally", () => {
  it("earns floor bounces at a rally of 10, 25, 45, 70, 100 and 135", () => {
    const bounces = [1, 2, 3, 4, 5, 6];

    expect(bounces.map((bounce) => bounceRally(bounce, FLIGHT_RULES))).toEqual([
      10, 25, 45, 70, 100, 135,
    ]);
  });

  it("earns them as the rules it is handed say", () => {
    const rules = { firstBounce: 6, bounceStep: 2 };

    expect([1, 2, 3].map((bounce) => bounceRally(bounce, rules))).toEqual([
      6, 14, 24,
    ]);
  });
});
