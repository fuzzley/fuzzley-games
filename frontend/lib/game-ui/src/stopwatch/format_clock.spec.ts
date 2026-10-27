import { formatClock } from "./format_clock";

describe("formatClock", () => {
  it.each([
    [0, "0:00"],
    [7, "0:07"],
    [133, "2:13"],
    [3599, "59:59"],
    [3600, "1:00:00"],
    [3733, "1:02:13"],
    [36000, "10:00:00"],
  ])("writes %d seconds as %s", (seconds, shown) => {
    expect(formatClock(seconds)).toBe(shown);
  });
});
