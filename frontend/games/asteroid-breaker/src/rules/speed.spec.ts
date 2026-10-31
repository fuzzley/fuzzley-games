import { SPEEDS, SPEED_INFO, isSpeed } from "./speed";

describe("SPEEDS", () => {
  it("lists the three speeds, slowest first", () => {
    expect(SPEEDS).toEqual(["relaxed", "normal", "fast"]);
  });
});

describe("SPEED_INFO", () => {
  it("has Normal set every factor at 1", () => {
    const { name, says, ...factors } = SPEED_INFO.normal;

    expect(factors).toEqual({ motion: 1, cometRate: 1, drops: 1 });
  });

  it.each([
    ["relaxed", "normal"],
    ["normal", "fast"],
  ] as const)("has %s's rocks move slower than %s's", (slower, faster) => {
    expect(SPEED_INFO[slower].motion).toBeLessThan(SPEED_INFO[faster].motion);
  });

  it("has Relaxed send comets half as often, and let a quarter more pickups go", () => {
    const { cometRate, drops } = SPEED_INFO.relaxed;

    expect({ cometRate, drops }).toEqual({ cometRate: 0.5, drops: 1.25 });
  });

  it("has Fast send comets and let pickups go as often as Normal", () => {
    const { cometRate, drops } = SPEED_INFO.fast;

    expect({ cometRate, drops }).toEqual({ cometRate: 1, drops: 1 });
  });
});

describe("isSpeed", () => {
  it.each(SPEEDS)("knows %s", (speed) => {
    expect(isSpeed(speed)).toBe(true);
  });

  it.each(["custom", "Normal", "", 1, null, undefined])(
    "refuses %j",
    (value) => {
      expect(isSpeed(value)).toBe(false);
    },
  );
});
