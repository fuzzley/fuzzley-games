import { LEVELS, LEVEL_INFO, allows, isLevel, levelOf } from "./difficulty";
import { TECHNIQUES } from "./logic";

describe("the levels", () => {
  it("run from Easy to Expert", () => {
    expect(LEVELS.map((level) => LEVEL_INFO[level].name)).toEqual([
      "Easy",
      "Medium",
      "Hard",
      "Expert",
    ]);
  });

  it("each say what they ask of the player", () => {
    expect(LEVELS.map((level) => LEVEL_INFO[level].asks)).toEqual([
      "Singles only",
      "Pairs and pointing",
      "Triples and X-Wings",
      "Swordfish and XY-Wings",
    ]);
  });
});

describe("levelOf", () => {
  it("puts each technique in the easiest level that allows it", () => {
    expect(TECHNIQUES.map(levelOf)).toEqual([
      "easy",
      "easy",
      "medium",
      "medium",
      "medium",
      "medium",
      "hard",
      "hard",
      "hard",
      "expert",
      "expert",
    ]);
  });
});

describe("allows", () => {
  it("allows a level's own techniques and those before them", () => {
    expect([allows("hard", "x-wing"), allows("hard", "pointing")]).toEqual([
      true,
      true,
    ]);
  });

  it("refuses the techniques of a harder level", () => {
    expect(allows("medium", "x-wing")).toBe(false);
  });
});

describe("isLevel", () => {
  it("accepts a level's id", () => {
    expect(isLevel("expert")).toBe(true);
  });

  it.each(["Expert", "custom", 3, null])("refuses %j", (value) => {
    expect(isLevel(value)).toBe(false);
  });
});
