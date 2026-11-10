import type { RunStage } from "@fz/core/run";
import { LEVELS } from "../levels/levels";
import { LEAST_DEPTH, MOST_DEPTH } from "../tuning";
import { PARS, type Pars, parFrom, parOf, starsFor, starsOf } from "./stars";

/** Every depth a field has, from 11 to 22. */
const DEPTHS = Array.from(
  { length: MOST_DEPTH - LEAST_DEPTH + 1 },
  (_, index) => LEAST_DEPTH + index,
);

/** Pars of two levels, each on a depth or two. */
const SOME_PARS: Pars = { first: { "11": 6, "12": 5 }, second: { "22": 9 } };

describe("parFrom", () => {
  it.each([
    [1, 2],
    [2, 3],
    [4, 6],
    [5, 8],
    [10, 15],
  ])("sets par for a certificate of %i rounds at %i", (rounds, par) => {
    expect(parFrom(rounds)).toBe(par);
  });
});

describe("parOf", () => {
  it("finds a level's par by its id and the depth", () => {
    expect([
      parOf("first", 11, SOME_PARS),
      parOf("first", 12, SOME_PARS),
      parOf("second", 22, SOME_PARS),
    ]).toEqual([6, 5, 9]);
  });

  it.each<[string, string, number]>([
    ["a level the pars lack", "third", 11],
    ["a depth the level's pars lack", "second", 11],
    ["a name every object has", "constructor", 11],
  ])("throws for %s", (_, id, depth) => {
    expect(() => parOf(id, depth, SOME_PARS)).toThrow(
      `Level "${id}" has no par on a field ${String(depth)} deep.`,
    );
  });

  it("reads the levels' pars by default", () => {
    expect(parOf("hello-wall", 11)).toBe(PARS["hello-wall"]?.["11"]);
  });
});

describe("PARS", () => {
  it("holds a par of a round or more for every level on every depth", () => {
    const pars = LEVELS.flatMap(({ data: { id } }) =>
      DEPTHS.map((depth) => parOf(id, depth)),
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
