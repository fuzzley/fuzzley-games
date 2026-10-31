import {
  CUSTOM_PERCENT,
  PRESET_SPEEDS,
  SPEEDS,
  SPEED_INFO,
  ballSpeed,
  customFactor,
  isCustomPercent,
  isSpeed,
} from "./speed";

describe("ballSpeed", () => {
  it("is the speed's base as a level starts", () => {
    expect(ballSpeed("normal", 1, 0)).toBe(25);
  });

  it("climbs by a share of the base for each brick hit", () => {
    // 1.5% of 25 for each of 10 hits.
    expect(ballSpeed("normal", 1, 10)).toBeCloseTo(28.75);
  });

  it("climbs no further than the speed's top", () => {
    expect(ballSpeed("normal", 1, 1000)).toBe(37.5);
  });

  it("is scaled by the level's pace, the top too", () => {
    expect([ballSpeed("fast", 1.2, 0), ballSpeed("fast", 1.2, 1000)]).toEqual([
      30 * 1.2,
      45 * 1.2,
    ]);
  });

  it("is scaled by a capsule past the top", () => {
    expect(ballSpeed("relaxed", 1, 1000, 1.25)).toBe(30 * 1.25);
  });
});

describe("SPEED_INFO", () => {
  it("has Custom's ball serve and climb as Normal's", () => {
    const { base, top } = SPEED_INFO.custom;

    expect({ base, top }).toEqual({
      base: SPEED_INFO.normal.base,
      top: SPEED_INFO.normal.top,
    });
  });

  it.each(SPEEDS)("tops %s's base", (speed) => {
    const { base, top } = SPEED_INFO[speed];

    expect(top).toBeGreaterThan(base);
  });
});

describe("customFactor", () => {
  it("is the player's percent at Custom", () => {
    expect(customFactor("custom", 150)).toBe(1.5);
  });

  it.each(PRESET_SPEEDS)(
    "is 1 at %s, whatever the player's percent",
    (speed) => {
      expect(customFactor(speed, 150)).toBe(1);
    },
  );
});

describe("isCustomPercent", () => {
  it.each([CUSTOM_PERCENT.least, 100, 135, CUSTOM_PERCENT.most])(
    "takes %s",
    (value) => {
      expect(isCustomPercent(value)).toBe(true);
    },
  );

  it.each([45, 205, 123, 99.5, Number.NaN, "100", null])(
    "refuses %j",
    (value) => {
      expect(isCustomPercent(value)).toBe(false);
    },
  );
});

describe("isSpeed", () => {
  it.each(SPEEDS)("knows %s", (speed) => {
    expect(isSpeed(speed)).toBe(true);
  });

  it.each(["slow", "", 1, null])("refuses %j", (value) => {
    expect(isSpeed(value)).toBe(false);
  });
});
