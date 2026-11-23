import { LEVEL_SETS } from "../rules/levels/levels";
import { CASUAL_FLOORS, playCasually } from "./casual";
import { HIGH_BRICK, NO_HITS, levelFrom } from "./level_picture";

/** A level of nine bricks of three hits. */
const THREES = levelFrom(["333333333"]);

describe("playCasually", () => {
  it("clears a level it can", () => {
    expect(playCasually(THREES, 11, 1).cleared).toBe(true);
  });

  it("plays the game its seed draws over every aim at every charge", () => {
    // Seeds whose games the charges drawn from the most would change; the
    // aims drawn from the last mirror this wall's games, which the solver's
    // spec catches. A change to the flight or the tuning may change them too:
    // then find two seeds again whose games that mistake changes.
    const rounds = [7, 11].map((seed) => playCasually(THREES, 11, seed).rounds);

    expect(rounds).toEqual([4, 3]);
  });

  it("plays through the rules it is handed, losing a level no shot takes a hit off", () => {
    expect(playCasually(HIGH_BRICK, 11, 1, NO_HITS)).toMatchObject({
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
