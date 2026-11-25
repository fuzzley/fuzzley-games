import { described, quantile, sortedTimes } from "./timing";

describe("sortedTimes", () => {
  it("sorts times from the least, as numbers rather than as text, leaving those handed as they were", () => {
    const times = [10, 9, 100];

    expect([sortedTimes(times), times]).toEqual([
      [9, 10, 100],
      [10, 9, 100],
    ]);
  });
});

describe("quantile", () => {
  it.each([
    [0, 10],
    [0.5, 30],
    [0.99, 40],
    [1, 50],
  ])("reads the time at %s of the way, the nearest below", (share, time) => {
    expect(quantile([10, 20, 30, 40, 50], share)).toBe(time);
  });

  it("reads no time of none", () => {
    expect(quantile([], 0.5)).toBeNaN();
  });
});

describe("described", () => {
  it("reads times in milliseconds as microseconds at the median and the 99th percentile, sorting them first", () => {
    expect(described([0.002, 0.001, 0.0035])).toBe(
      "median 2.00 µs, p99 2.00 µs",
    );
  });
});
