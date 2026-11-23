import { kindsWhere } from "./kinds";

/** A catalog of kinds made up for the spec, each with the hits it takes and whether a level needs it broken. */
const CATALOG = {
  pebble: { hits: 1, needed: true },
  slate: { hits: 0, needed: false },
  flint: { hits: 3, needed: true },
};

describe("kindsWhere", () => {
  it("returns the kinds a test holds for, in the catalog's order", () => {
    expect(kindsWhere(CATALOG, ({ needed }) => needed)).toEqual([
      "pebble",
      "flint",
    ]);
  });

  it("hands the test each kind's id", () => {
    expect(kindsWhere(CATALOG, (_, id) => id.startsWith("s"))).toEqual([
      "slate",
    ]);
  });

  it("returns none where the test holds for none", () => {
    expect(kindsWhere(CATALOG, ({ hits }) => hits > 3)).toEqual([]);
  });
});
