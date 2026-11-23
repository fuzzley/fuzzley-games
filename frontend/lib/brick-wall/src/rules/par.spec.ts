import { type Pars, parFrom, parOf } from "./par";

/** Pars of two levels made up for the spec, each on a depth or two. */
const SOME_PARS: Pars = { first: { "11": 6, "12": 5 }, second: { "22": 9 } };

describe("parFrom", () => {
  it.each([
    [1, 2],
    [2, 3],
    [4, 6],
    [5, 8],
    [10, 15],
  ])(
    "sets par for a certificate of %i rounds, half as many again, at %i",
    (rounds, par) => {
      expect(parFrom(rounds, 1.5)).toBe(par);
    },
  );

  it.each([
    [3, 1, 3],
    [3, 1.25, 4],
    [4, 1.25, 5],
    [6, 2, 12],
  ])(
    "sets par for a certificate of %i rounds at %f times them, rounded up: %i",
    (rounds, share, par) => {
      expect(parFrom(rounds, share)).toBe(par);
    },
  );
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
      new RangeError(
        `Level "${id}" has no par on a field ${String(depth)} deep.`,
      ),
    );
  });
});
