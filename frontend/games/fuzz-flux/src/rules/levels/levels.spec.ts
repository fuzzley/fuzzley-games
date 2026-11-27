import { DESIGN_SETS, designSet } from "../../testing/design_files";
import bedtime from "./bedtime.json";
import bricksAndBars from "./bricks-and-bars.json";
import { LEVELS, LEVEL_SETS } from "./levels";
import warmUp from "./warm-up.json";
import windyDays from "./windy-days.json";

/** Each set's file as the game keeps it, by the name of the design's file it copies. */
const COPIES: Readonly<Record<(typeof DESIGN_SETS)[number], unknown>> = {
  "warm-up": warmUp,
  "bricks-and-bars": bricksAndBars,
  bedtime,
  "windy-days": windyDays,
};

describe("the levels", () => {
  it("are Warm-up's alone, while the other sets are built", () => {
    expect(LEVEL_SETS.map(({ id }) => id)).toEqual(["warm-up"]);
  });

  it("number Warm-up's levels 1 to 9, each by its id, as the design's appendix does", () => {
    expect(
      LEVELS.map(({ number, data }) => [number, data.id, data.name]),
    ).toEqual([
      [1, "1", "Three's company"],
      [2, "2", "Four across"],
      [3, "3", "Square deal"],
      [4, "4", "Round the bend"],
      [5, "5", "High five"],
      [6, "6", "Better together"],
      [7, "7", "Mind the gap"],
      [8, "8", "Dust-up"],
      [9, "9", "Spring cleaning"],
    ]);
  });

  it.each(DESIGN_SETS)("keep the set %s as the design's file has it", (set) => {
    expect(COPIES[set]).toEqual(designSet(set));
  });
});
