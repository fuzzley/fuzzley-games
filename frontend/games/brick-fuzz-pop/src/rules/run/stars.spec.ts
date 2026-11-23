import { DEPTHS } from "@fz/brick-wall/rules/field";
import { parOf } from "@fz/brick-wall/rules/par";
import type { RunStage } from "@fz/core/run";
import { LEVELS } from "../levels/levels";
import { PARS, starsFor, starsOf } from "./stars";

describe("PARS", () => {
  it("holds a par of a round or more for every level on every depth", () => {
    const pars = LEVELS.flatMap(({ data: { id } }) =>
      DEPTHS.map((depth) => parOf(id, depth, PARS)),
    );

    expect(pars.filter((par) => !Number.isInteger(par) || par < 1)).toEqual([]);
  });

  it("holds the pars of no level the game lacks", () => {
    const ids = new Set(LEVELS.map(({ data: { id } }) => id));

    expect(Object.keys(PARS).filter((id) => !ids.has(id))).toEqual([]);
  });

  it("holds the pars of no depth a field lacks", () => {
    const depths = Object.values(PARS).flatMap((byDepth) =>
      Object.keys(byDepth),
    );

    expect(new Set(depths)).toEqual(new Set(DEPTHS.map(String)));
  });
});

describe("starsFor", () => {
  it.each([
    [4, 3],
    [6, 3],
    [7, 2],
    [9, 2],
    [10, 1],
    [30, 1],
  ])(
    "gives a level of par 6 cleared in %i rounds %i stars",
    (rounds, stars) => {
      expect(starsFor(rounds, 6)).toBe(stars);
    },
  );
});

describe("starsOf", () => {
  it.each<RunStage>(["cleared", "won"])(
    "gives a level %s the stars its rounds earn",
    (outcome) => {
      expect(starsOf({ outcome, rounds: 7, par: 6 })).toBe(2);
    },
  );

  it.each<RunStage>(["ready", "playing", "paused", "over"])(
    "gives a level %s none",
    (outcome) => {
      expect(starsOf({ outcome, rounds: 7, par: 6 })).toBe(0);
    },
  );
});
