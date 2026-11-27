import { starsLitAt } from "./stars_lit";

describe("starsLitAt", () => {
  const end = {
    cardMs: 1000,
    starsMs: [1200, 1500, 1800],
    hurriedFromMs: 500,
  };

  it.each([
    [1200, 0],
    [1201, 1],
    [1800, 2],
    [Infinity, 3],
  ])("has the stars lit by %i ms be %i", (ms, lit) => {
    expect(starsLitAt(end, ms)).toBe(lit);
  });
});
