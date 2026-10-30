import { type LevelSetData, levelsOf } from "./levels";
import { clearedOf, isOpen } from "./progress";

/** Four levels of one brick each, "a" to "d", numbered 1 to 4. */
const LEVELS = levelsOf([
  {
    id: "set",
    name: "Set",
    drops: 0,
    levels: ["a", "b", "c", "d"].map((id) => ({
      id,
      name: id,
      capsules: [],
      bricks: ["o"],
    })),
  } satisfies LevelSetData,
]);

describe("isOpen", () => {
  it("opens the first level from the start", () => {
    expect(isOpen(LEVELS, new Set(), 1)).toBe(true);
  });

  it("keeps the others closed until a level is cleared", () => {
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
