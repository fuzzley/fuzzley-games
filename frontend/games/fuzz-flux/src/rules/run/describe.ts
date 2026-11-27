// What the game says of a level in play, in the words on the screen or
// fewer: each goal's name, as the bar says it beside its picture, and the
// line about what a level brings in new.

import type { Goal } from "../catalog/goals";
import type { NewThing } from "../levels/level";

/** The line about each thing a level can bring in new: what you do, then what it does. */
const NEW_THING_LINES: Readonly<Record<NewThing, string>> = {
  bunch: "Swap 2 fuzzballs to line up 3 of a kind.",
  dasher:
    "Line up 4 to make a dasher. It clears the row or column its fur points along.",
  wisp: "Make a square of 4 to get a wisp. It floats to where you need it.",
  puffer:
    "Line up 5 in an L or a T to make a puffer. Swap it to clear the squares around it.",
  frizzball:
    "Line up 5 to make a frizzball. Swap it with a fuzzball to gather all of that kind.",
  pair: "Swap 2 special fuzzballs with each other. They go off together.",
  dust: "Line up 3 on dusty squares to dust them off.",
  brick: "Line up 3 next to a brick to break it.",
  "thick-brick":
    "Thick bricks have 2 to 4 layers. Line up 3 next to one to knock a layer off.",
  cage: "Line up a caged fuzzball with 2 of its kind to free it.",
  sleepyhead:
    "Get each sleepyhead to the bottom row. Clear the fuzzballs under it.",
  burr: "You can't swap a fuzzball that has a burr. Line up 3 next to it to brush the burr off.",
  wind: "The wind is blowing. Fuzzballs fall the way it blows.",
  "turning-wind": "The wind turns every few moves. Watch the arrow.",
};

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

/** Returns the line about something a level brings in new. */
export function newThingLine(thing: NewThing): string {
  return NEW_THING_LINES[thing];
}
