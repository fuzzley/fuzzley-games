import {
  AIMS_PER_DEGREE,
  AIM_COUNT,
  AT_ONCE,
  BORED,
  COLUMNS,
  FIRST_AIM_DEGREES,
  FIRST_X,
  LEAST_DEPTH,
  MOST_DEPTH,
  MOST_FLIGHT,
  MOST_FRIENDS,
  MOST_FUZZBALLS,
  RADIUS,
  SIDE_MARGIN,
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

  it("lets a fuzzball through a gap one cell wide", () => {
    expect(2 * RADIUS).toBeLessThan(1);
  });

  it("keeps a waiting fuzzball clear of the side walls", () => {
    expect(SIDE_MARGIN).toBeGreaterThanOrEqual(RADIUS);
  });

  it("starts a level's first shot from the floor's middle", () => {
    expect(FIRST_X).toBe(COLUMNS / 2);
  });

  it("lets a field grow no shallower than it is", () => {
    expect(MOST_DEPTH).toBeGreaterThanOrEqual(LEAST_DEPTH);
  });

  it("flies the player's fuzzball, a triple shot's mates and every friend at once", () => {
    expect(MOST_FUZZBALLS).toBeGreaterThanOrEqual(
      1 + TRIPLE_MATES + MOST_FRIENDS,
    );
  });

  it("bores a fuzzball long before its flight is capped", () => {
    expect(BORED).toBeLessThan(MOST_FLIGHT);
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
