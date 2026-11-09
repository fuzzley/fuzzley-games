import {
  clamp,
  easeOutCubic,
  fadeAlpha,
  lerp,
  multiplierAt,
  nextMarkAfter,
  shareDone,
} from "./math";

describe("clamp", () => {
  it.each([
    ["below the least", -2, 0],
    ["between them", 3, 3],
    ["above the most", 9, 5],
  ])("keeps a number %s between them", (_, value, kept) => {
    expect(clamp(value, 0, 5)).toBe(kept);
  });
});

describe("lerp", () => {
  it.each([
    [0, 2],
    [0.25, 2.5],
    [1, 4],
  ])("is, %s of the way from 2 to 4, at %s", (share, at) => {
    expect(lerp(2, 4, share)).toBe(at);
  });

  it("goes past either number outside a share of 0 to 1", () => {
    expect([lerp(2, 4, -0.5), lerp(2, 4, 1.5)]).toEqual([1, 5]);
  });

  it("goes from a larger number down to a smaller one", () => {
    expect(lerp(4, 2, 0.25)).toBe(3.5);
  });

  // Every game drew with from + (to − from) × share before it was lifted, and
  // another order rounds otherwise: from × (1 − share) + to × share gives 1.
  it("keeps the order the games drew in, which may round short of the second number", () => {
    expect(lerp(1e16, 1, 1)).toBe(0);
  });
});

describe("shareDone", () => {
  it.each([
    [1000, 0],
    [1050, 0.5],
    [1100, 1],
    [1200, 1],
    [900, 0],
  ])("is, at %i, %s of the way through 100 begun at 1000", (now, done) => {
    expect(shareDone(1000, now, 100)).toBe(done);
  });

  it("is over for something never started, begun at −Infinity", () => {
    expect(shareDone(-Infinity, 0, 100)).toBe(1);
  });
});

describe("the curves", () => {
  it("eases out from nothing to all of it, fast and then slowing", () => {
    expect([easeOutCubic(0), easeOutCubic(0.5), easeOutCubic(1)]).toEqual([
      0, 0.875, 1,
    ]);
  });

  it("fades from opaque to nothing", () => {
    expect([fadeAlpha(0), fadeAlpha(0.25), fadeAlpha(1)]).toEqual([1, 0.75, 0]);
  });
});

describe("nextMarkAfter", () => {
  it.each([
    [0, 20_000],
    [19_999, 20_000],
    [20_000, 50_000],
    [35_000, 50_000],
    [49_999, 50_000],
    [50_000, 80_000],
    [50_001, 80_000],
  ])(
    "puts the next mark past %i, first at 20,000 and every 30,000 after, at %i",
    (score, mark) => {
      expect(nextMarkAfter(score, 20_000, 30_000)).toBe(mark);
    },
  );
});

describe("multiplierAt", () => {
  /** A ladder as a breaker's, listed from the highest. */
  const TIERS = [
    { from: 20, times: 4 },
    { from: 10, times: 3 },
    { from: 5, times: 2 },
  ];

  it.each([
    [0, 1],
    [4, 1],
    [5, 2],
    [9, 2],
    [10, 3],
    [19, 3],
    [20, 4],
    [50, 4],
  ])("scores a count of %i, %i times", (count, times) => {
    expect(multiplierAt(count, TIERS)).toBe(times);
  });

  it("scores once on a ladder of no tiers", () => {
    expect(multiplierAt(50, [])).toBe(1);
  });
});
