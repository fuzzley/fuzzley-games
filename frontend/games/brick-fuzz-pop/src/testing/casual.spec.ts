import { LEVEL_SETS } from "../rules/levels/levels";
import { CASUAL_FLOORS, playCasually } from "./casual";
import { HIGH_BRICK, NO_HITS, levelFrom } from "./level_picture";

/** A level of nine bricks of three hits. */
const THREES = levelFrom(["333333333"]);

describe("playCasually", () => {
  it("clears a level it can", () => {
    expect(playCasually(THREES, 11, 1).cleared).toBe(true);
  });

  it("plays the same game from the same seed", () => {
    expect(playCasually(THREES, 11, 7)).toEqual(playCasually(THREES, 11, 7));
  });

  it("plays the game its seed draws, the first best of sixteen looks a round", () => {
    // Seeds whose games 15 looks a round, or the last best of a tie, would
    // change. A change to the flight or the tuning may change them too: then
    // find two seeds again whose games those two mistakes change.
    const rounds = [7, 11].map((seed) => playCasually(THREES, 11, seed).rounds);

    expect(rounds).toEqual([4, 3]);
  });

  it("loses a level it can't take a hit off, counting its rounds, its jumps and the lowest row a needed brick stood in", () => {
    expect(playCasually(HIGH_BRICK, 11, 1, NO_HITS)).toEqual({
      cleared: false,
      rounds: 6,
      jumps: 1,
      leastRow: 1,
    });
  });
});

describe("CASUAL_FLOORS", () => {
  it("holds a floor for every set of levels", () => {
    const sets = LEVEL_SETS.map(({ id }) => id);

    expect(sets.filter((id) => !(id in CASUAL_FLOORS))).toEqual([]);
  });
});
