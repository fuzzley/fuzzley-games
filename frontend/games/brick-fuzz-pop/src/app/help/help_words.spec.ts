import { howOften } from "./help_words";

describe("howOften", () => {
  it.each([
    [1, "once"],
    [2, "twice"],
    [3, "3 times"],
    [0, "0 times"],
  ])("counts %i as %s", (times, words) => {
    expect(howOften(times)).toBe(words);
  });
});
