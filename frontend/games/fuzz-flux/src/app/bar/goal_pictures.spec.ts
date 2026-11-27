import type { Goal } from "../../rules/catalog/goals";
import { PICTURES } from "../../testing/pictures";
import { goalPictureOf } from "./goal_pictures";

describe("goalPictureOf", () => {
  it.each<[Goal, string]>([
    [{ what: "gather", kind: "violet", count: 12 }, PICTURES.kinds.violet],
    [{ what: "dust" }, PICTURES.dust[0] ?? ""],
    [{ what: "brick" }, PICTURES.brick],
    [{ what: "cage" }, PICTURES.caged],
    [{ what: "sleepyhead" }, PICTURES.sleepyhead],
  ])("shows %j as its picture", (goal, picture) => {
    expect(goalPictureOf(goal, PICTURES)).toBe(picture);
  });
});
