import SPEED_TS from "../../rules/speed.ts?raw";
import {
  BALL_SPEED_SLIDER,
  formatScale,
  speedLines,
  unitsOf,
} from "./debug_tuning";

describe("BALL_SPEED_SLIDER", () => {
  it("holds the speed's own scale, 1, on a step of its range", () => {
    const { least, most, step } = BALL_SPEED_SLIDER;
    const steps = (1 - least) / step;

    expect(1).toBeGreaterThanOrEqual(least);
    expect(1).toBeLessThanOrEqual(most);
    expect(steps).toBeCloseTo(Math.round(steps));
  });
});

describe("formatScale", () => {
  it.each([
    [1, "×1.00"],
    [1.5, "×1.50"],
    [0.55, "×0.55"],
  ])("writes %s as %s", (scale, written) => {
    expect(formatScale(scale)).toBe(written);
  });
});

describe("unitsOf", () => {
  it.each([
    [37.5, "37.5"],
    [56.25, "56.3"],
    [45, "45"],
  ])("writes %s units a second as %s", (speed, written) => {
    expect(unitsOf(speed)).toBe(written);
  });
});

describe("speedLines", () => {
  it("writes speed.ts's own lines at the speed's own scale, so a paste changes only what was tuned", () => {
    const written = new Set(SPEED_TS.split("\n").map((line) => line.trim()));

    const lines = speedLines(1).split("\n");

    expect(
      lines.filter((line) => !line.startsWith("//") && !written.has(line)),
    ).toEqual([]);
  });

  it("writes each preset speed's base and top scaled, to three places, under the record that holds them", () => {
    expect(speedLines(1.05)).toBe(
      [
        "// SPEED_INFO.relaxed",
        "base: 21,",
        "top: 31.5,",
        "// NORMAL",
        "base: 26.25,",
        "top: 39.375,",
        "// SPEED_INFO.fast",
        "base: 31.5,",
        "top: 47.25,",
      ].join("\n"),
    );
  });
});
