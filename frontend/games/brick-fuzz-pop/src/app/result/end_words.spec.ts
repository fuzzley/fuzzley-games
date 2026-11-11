import { tryAgainLabel, whereLost } from "./end_words";

describe("whereLost", () => {
  it("names the level a run was lost on, by its number and its name", () => {
    expect(whereLost(3, "Thicker")).toBe("Lost on level 3, Thicker");
  });
});

describe("tryAgainLabel", () => {
  it("names the level a try starts from", () => {
    expect(tryAgainLabel(3)).toBe("Try again from level 3");
  });
});
