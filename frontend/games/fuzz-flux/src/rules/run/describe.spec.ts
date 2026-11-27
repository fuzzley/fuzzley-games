import type { Goal } from "../catalog/goals";
import { goalName, newThingLine } from "./describe";

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

describe("newThingLine", () => {
  it("says what you do to make a thing, then what it does", () => {
    expect(newThingLine("dasher")).toBe(
      "Line up 4 to make a dasher. It clears the row or column its fur points along.",
    );
  });
});
