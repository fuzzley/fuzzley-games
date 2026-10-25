import { formatTime } from "./format";

describe("formatTime", () => {
  it.each([
    [0, "0:00"],
    [9, "0:09"],
    [133, "2:13"],
    [3600, "60:00"],
  ])("shows %d seconds as %s", (seconds, shown) => {
    expect(formatTime(seconds)).toBe(shown);
  });
});
