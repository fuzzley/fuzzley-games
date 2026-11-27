import type { Goal } from "../catalog/goals";
import { goalName } from "./describe";

describe("goalName", () => {
  it.each<[Goal, string]>([
    [{ what: "gather", kind: "violet", count: 12 }, "violet"],
    [{ what: "dust" }, "dust"],
    [{ what: "brick" }, "bricks"],
    [{ what: "cage" }, "cages"],
    [{ what: "sleepyhead" }, "sleepyheads"],
  ])("names %j %s", (goal, name) => {
    expect(goalName(goal)).toBe(name);
  });
});
