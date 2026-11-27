// What the game says of a level in play, in the words on the screen or
// fewer: each goal's name, as the bar says it beside its picture.

import type { Goal } from "../catalog/goals";

/** Returns a goal's name, as the bar says it beside its picture: its kind of fuzzball, or the element it clears. */
export function goalName(goal: Goal): string {
  switch (goal.what) {
    case "gather":
      return goal.kind;
    case "dust":
      return "dust";
    case "brick":
      return "bricks";
    case "cage":
      return "cages";
    case "sleepyhead":
      return "sleepyheads";
  }
}
