import { SPEEDS, SPEED_INFO, ballSpeed, isSpeed } from "./speed";

describe("ballSpeed", () => {
  it("is the speed's base as a level starts", () => {
    expect(ballSpeed("normal", 1, 0)).toBe(16);
  });

  it("climbs by a share of the base for each brick hit", () => {
    // 1.5% of 16 for each of 10 hits.
    expect(ballSpeed("normal", 1, 10)).toBeCloseTo(18.4);
  });

  it("climbs no further than the speed's top", () => {
    expect(ballSpeed("normal", 1, 1000)).toBe(24);
  });

  it("is scaled by the level's pace, the top too", () => {
    expect([ballSpeed("fast", 1.2, 0), ballSpeed("fast", 1.2, 1000)]).toEqual([
      19 * 1.2,
      29 * 1.2,
    ]);
  });

  it("is scaled by a capsule past the top", () => {
    expect(ballSpeed("relaxed", 1, 1000, 1.25)).toBe(19 * 1.25);
  });
});

describe("SPEED_INFO", () => {
  it.each(SPEEDS)("tops %s's base", (speed) => {
    const { base, top } = SPEED_INFO[speed];

    expect(top).toBeGreaterThan(base);
  });
});

describe("isSpeed", () => {
  it.each(SPEEDS)("knows %s", (speed) => {
    expect(isSpeed(speed)).toBe(true);
  });

  it.each(["slow", "", 1, null])("refuses %j", (value) => {
    expect(isSpeed(value)).toBe(false);
  });
});
