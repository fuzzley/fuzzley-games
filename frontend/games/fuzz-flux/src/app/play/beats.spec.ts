import type { Timeline } from "../../view/timeline/timeline";
import { cardAt, goalsLeftAt, hasPassed, sameCounts } from "./beats";

/** Returns a timeline whose level's end shows its card at a moment, or one that ends nothing. */
function endingAt(cardMs: number | null): Pick<Timeline, "end"> {
  return {
    end: cardMs === null ? null : { cardMs, starsMs: [], hurriedFromMs: null },
  };
}

describe("hasPassed", () => {
  it("passes a beat in the first frame that stands past it", () => {
    expect([hasPassed(100, 100), hasPassed(100, 101)]).toEqual([false, true]);
  });
});

describe("goalsLeftAt", () => {
  it("keeps each goal's count to the last of its counts to land", () => {
    const counts = [
      { atMs: 10, goal: 0, left: 5 },
      { atMs: 20, goal: 0, left: 4 },
      { atMs: 30, goal: 1, left: 0 },
    ];

    expect(goalsLeftAt(counts, [6, 2], 25)).toEqual([4, 2]);
  });
});

describe("sameCounts", () => {
  it.each([
    [[1, 2], [1, 2], true],
    [[1, 2], [2, 1], false],
    [[1], [1, 0], false],
  ])("finds %j and %j the same: %s", (one, other, same) => {
    expect(sameCounts(one, other)).toBe(same);
  });
});

describe("cardAt", () => {
  it.each([
    ["before its beat", 100, 50, null],
    ["after its beat", 100, 150, { what: "over" }],
    ["for a move that ends nothing", null, 150, null],
  ] as const)("shows the card %s", (_, cardMs, playedMs, shown) => {
    const timeline = endingAt(cardMs);

    expect(cardAt(timeline, { what: "over" }, playedMs)).toEqual(shown);
  });
});
