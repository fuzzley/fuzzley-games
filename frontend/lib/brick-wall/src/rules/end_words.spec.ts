import { endTitle, tryAgainLabel, whereLost } from "./end_words";

describe("endTitle", () => {
  it("calls a run won every level cleared, and one lost the game over", () => {
    expect([
      endTitle({ outcome: "won" }),
      endTitle({ outcome: "over" }),
    ]).toEqual(["Every level cleared!", "Game over"]);
  });
});

describe("whereLost", () => {
  it("names the level a run was lost on, by its number and its name", () => {
    expect(whereLost(3, "Gravel")).toBe("Lost on level 3, Gravel");
  });
});

describe("tryAgainLabel", () => {
  it("names the level a try starts from", () => {
    expect(tryAgainLabel(3)).toBe("Try again from level 3");
  });
});
