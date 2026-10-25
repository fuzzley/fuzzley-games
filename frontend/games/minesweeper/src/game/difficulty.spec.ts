import {
  CUSTOM_SIDE,
  DEFAULT_CUSTOM,
  PRESETS,
  difficultyName,
  isDifficultyId,
  isValidLives,
  isValidSize,
  maxMines,
  sizeOf,
} from "./difficulty";

describe("maxMines", () => {
  it("leaves nine squares clear", () => {
    expect(maxMines(20, 20)).toBe(391);
  });
});

describe("isValidSize", () => {
  it("takes the 2016 game's field", () => {
    expect(isValidSize(DEFAULT_CUSTOM)).toBe(true);
  });

  it("takes every classic field", () => {
    expect(Object.values(PRESETS).every((p) => isValidSize(p.size))).toBe(true);
  });

  it("takes the smallest and largest sides", () => {
    expect(
      isValidSize({ rows: CUSTOM_SIDE.min, cols: CUSTOM_SIDE.max, mines: 1 }),
    ).toBe(true);
  });

  it.each([
    ["too few rows", { rows: 4, cols: 10, mines: 5 }],
    ["too many columns", { rows: 10, cols: 31, mines: 5 }],
    ["part of a row", { rows: 9.5, cols: 10, mines: 5 }],
    ["no mines", { rows: 10, cols: 10, mines: 0 }],
    ["too many mines", { rows: 10, cols: 10, mines: 92 }],
    ["part of a mine", { rows: 10, cols: 10, mines: 2.5 }],
  ])("refuses %s", (_, size) => {
    expect(isValidSize(size)).toBe(false);
  });
});

describe("isValidLives", () => {
  it.each([1, 3, 5])("takes %i", (lives) => {
    expect(isValidLives(lives)).toBe(true);
  });

  it.each([0, 6, 2.5])("refuses %d", (lives) => {
    expect(isValidLives(lives)).toBe(false);
  });
});

describe("isDifficultyId", () => {
  it("knows the difficulties", () => {
    expect(isDifficultyId("custom")).toBe(true);
  });

  it("refuses anything else", () => {
    expect(isDifficultyId("expert")).toBe(false);
  });
});

describe("sizeOf", () => {
  it("gives a classic field its own size", () => {
    expect(sizeOf("hard", DEFAULT_CUSTOM)).toEqual({
      rows: 16,
      cols: 30,
      mines: 99,
    });
  });

  it("gives Custom the player's", () => {
    const custom = { rows: 8, cols: 12, mines: 20 };

    expect(sizeOf("custom", custom)).toBe(custom);
  });
});

describe("difficultyName", () => {
  it("names a classic field", () => {
    expect(difficultyName("medium")).toBe("Medium");
  });

  it("names the player's own", () => {
    expect(difficultyName("custom")).toBe("Custom");
  });
});
