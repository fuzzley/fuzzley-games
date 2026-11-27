import type { Goal } from "../catalog/goals";
import { countedOff, goalsMet, stillCounts } from "./goals";

/** A level's goals: two that gather blue, one red, and every cage. */
const GOALS: readonly Goal[] = [
  { what: "gather", kind: "blue", count: 10 },
  { what: "gather", kind: "red", count: 10 },
  { what: "cage" },
  { what: "gather", kind: "blue", count: 5 },
];

describe("countedOff", () => {
  it("counts a fuzzball gathered toward each goal that gathers its kind", () => {
    const game = { goals: GOALS, goalsLeft: [4, 4, 2, 1] };

    expect(countedOff(game, { what: "gather", kind: "blue" })).toEqual([
      3, 4, 2, 0,
    ]);
  });

  it("counts an element's change toward its element's goal alone", () => {
    const game = { goals: GOALS, goalsLeft: [4, 4, 2, 1] };

    expect(countedOff(game, { what: "cage" })).toEqual([4, 4, 1, 1]);
  });

  it("counts nothing that no goal counts", () => {
    const game = { goals: GOALS, goalsLeft: [4, 4, 2, 1] };

    expect([
      countedOff(game, { what: "gather", kind: "amber" }),
      countedOff(game, { what: "brick" }),
    ]).toEqual([
      [4, 4, 2, 1],
      [4, 4, 2, 1],
    ]);
  });

  it("counts on below 0 a goal already met", () => {
    const game = { goals: GOALS, goalsLeft: [0, 4, 2, -1] };

    expect(countedOff(game, { what: "gather", kind: "blue" })).toEqual([
      -1, 4, 2, -2,
    ]);
  });

  it("leaves the goals it is handed as they were", () => {
    const goalsLeft = [4, 4, 2, 1];

    countedOff({ goals: GOALS, goalsLeft }, { what: "cage" });

    expect(goalsLeft).toEqual([4, 4, 2, 1]);
  });
});

describe("stillCounts", () => {
  it("finds a goal still open that counts something taken", () => {
    const game = { goals: GOALS, goalsLeft: [0, 4, 1, 1] };

    expect([
      stillCounts(game, { what: "gather", kind: "blue" }),
      stillCounts(game, { what: "cage" }),
    ]).toEqual([true, true]);
  });

  it("finds none where each goal that counts it is met, or none counts it", () => {
    const game = { goals: GOALS, goalsLeft: [0, 4, 0, -1] };

    expect([
      stillCounts(game, { what: "gather", kind: "blue" }),
      stillCounts(game, { what: "cage" }),
      stillCounts(game, { what: "brick" }),
    ]).toEqual([false, false, false]);
  });
});

describe("goalsMet", () => {
  it("finds every goal met where each needs nothing more, one counted on below 0 among them", () => {
    expect(goalsMet({ goalsLeft: [0, -2, 0] })).toBe(true);
  });

  it("finds a goal still open where one needs more", () => {
    expect(goalsMet({ goalsLeft: [0, 1, -2] })).toBe(false);
  });
});
