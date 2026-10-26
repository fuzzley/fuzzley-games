import { count, formatTime } from "./format";

describe("count", () => {
  it("names one in the singular", () => {
    expect(count(1, "mine", "mines")).toBe("1 mine");
  });

  it("names none in the plural", () => {
    expect(count(0, "mine", "mines")).toBe("0 mines");
  });
});

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
