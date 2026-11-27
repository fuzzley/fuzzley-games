import { itemAt } from "@fz/core/records";
import type { Goal } from "../../rules/catalog/goals";
import type { Pictures } from "../../scene/pictures";

/** Returns the picture of what a goal asks for, as the bar shows it: a fuzzball of its kind, or the element it clears. */
export function goalPictureOf(goal: Goal, pictures: Pictures): string {
  switch (goal.what) {
    case "gather":
      return pictures.kinds[goal.kind];
    case "dust":
      return itemAt(pictures.dust, 0);
    case "brick":
      return pictures.brick;
    case "cage":
      return pictures.caged;
    case "sleepyhead":
      return pictures.sleepyhead;
  }
}
