import { itemAt } from "@fz/core/records";
import { SMALL_LEVELS } from "../../testing/small_levels";
import { starsEarned } from "./stars";

/** The first of the small levels, whose stars ask for 0, 2 and 4 moves to spare. */
const LEVEL = itemAt(SMALL_LEVELS, 0).data;

describe("starsEarned", () => {
  it.each([
    [0, 1],
    [1, 1],
    [2, 2],
    [4, 3],
  ])(
    "earns a level cleared with %i moves to spare %i stars",
    (spare, stars) => {
      expect(starsEarned(LEVEL, spare)).toBe(stars);
    },
  );
});
