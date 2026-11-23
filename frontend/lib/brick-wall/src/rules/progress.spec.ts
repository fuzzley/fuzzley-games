import { clearedOf, isOpen, levelIdOf } from "./progress";

/** Four levels made up for the spec, "a" to "d", numbered 1 to 4. */
const LEVELS = ["a", "b", "c", "d"].map((id) => ({ data: { id } }));

describe("levelIdOf", () => {
  it("finds a level's id by its number, from 1", () => {
    expect([1, 4].map((level) => levelIdOf(LEVELS, level))).toEqual(["a", "d"]);
  });

  it.each([0, 5])("throws for level %i, which the game hasn't", (level) => {
    expect(() => levelIdOf(LEVELS, level)).toThrow(
      new RangeError(
        `There is no level ${String(level)}: the levels run from 1 to 4.`,
      ),
    );
  });
});

describe("isOpen", () => {
  it("opens the first level from the start", () => {
    expect(isOpen(LEVELS, new Set(), 1)).toBe(true);
  });

  it("keeps the others locked until a level is cleared", () => {
    expect([2, 3, 4].map((level) => isOpen(LEVELS, new Set(), level))).toEqual([
      false,
      false,
      false,
    ]);
  });

  it("opens the level after one cleared, and keeps the one cleared open", () => {
    const cleared = new Set(["c"]);

    expect([1, 2, 3, 4].map((level) => isOpen(LEVELS, cleared, level))).toEqual(
      [true, false, true, true],
    );
  });

  it.each([0, 5])("opens no level %i, which the game hasn't", (level) => {
    expect(isOpen(LEVELS, new Set(["a", "b", "c", "d"]), level)).toBe(false);
  });
});

describe("clearedOf", () => {
  it("keeps the ids of the game's levels", () => {
    expect(clearedOf(["a", "c"], LEVELS)).toEqual(new Set(["a", "c"]));
  });

  it("drops an id no level has any more, and anything not an id", () => {
    expect(clearedOf(["a", "gone", 3, null], LEVELS)).toEqual(new Set(["a"]));
  });

  it.each([undefined, "a", { a: true }])(
    "takes %j as nothing cleared",
    (value) => {
      expect(clearedOf(value, LEVELS)).toEqual(new Set());
    },
  );
});
