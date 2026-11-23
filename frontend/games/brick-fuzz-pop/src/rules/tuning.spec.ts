import { AT_ONCE } from "@fz/brick-wall/rules/field";
import {
  AIMS_PER_DEGREE,
  AIM_COUNT,
  BORED,
  FIRST_AIM_DEGREES,
  IDLE_SHARE,
  MOST_FLIGHT,
  MOST_FRIENDS,
  MOST_FUZZBALLS,
  STREAK,
  TRIPLE_MATES,
  ZAP_DELAY,
} from "./tuning";

// The numbers are the game's to tune; these hold what tuning must not break.
describe("the tuning", () => {
  it("aims as far toward one side as toward the other", () => {
    const last = FIRST_AIM_DEGREES + (AIM_COUNT - 1) / AIMS_PER_DEGREE;

    expect(last).toBe(180 - FIRST_AIM_DEGREES);
  });

  it("flies the player's fuzzball, a triple shot's mates and every friend at once", () => {
    expect(MOST_FUZZBALLS).toBeGreaterThanOrEqual(
      1 + TRIPLE_MATES + MOST_FRIENDS,
    );
  });

  it("lets a fuzzball fly further without a hit than without a touch", () => {
    expect(IDLE_SHARE).toBeGreaterThan(1);
  });

  it("brings an idle fuzzball home long before its flight is capped", () => {
    expect(BORED * IDLE_SHARE).toBeLessThan(MOST_FLIGHT);
  });

  // So a zap is never met at the moment of the break that set it off, as
  // the flight's order of events has it.
  it("lands a zap at a later moment than the break that set it off", () => {
    expect(ZAP_DELAY).toBeGreaterThan(AT_ONCE);
  });

  it("lists the streak's multipliers from the highest", () => {
    const froms = STREAK.map(({ from }) => from);
    const times = STREAK.map(({ times: each }) => each);

    expect({ froms, times }).toEqual({
      froms: [...froms].sort((a, b) => b - a),
      times: [...times].sort((a, b) => b - a),
    });
  });
});
