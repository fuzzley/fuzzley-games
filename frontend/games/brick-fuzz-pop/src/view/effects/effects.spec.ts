import { SOUNDS } from "./effects";

describe("SOUNDS", () => {
  it("names the game's twenty sounds", () => {
    expect(SOUNDS).toHaveLength(20);
  });

  it("names each sound once", () => {
    expect(new Set(SOUNDS).size).toBe(SOUNDS.length);
  });

  it.each(SOUNDS)("names %s in a word, in lower case", (name) => {
    expect(name).toMatch(/^[a-z]+$/);
  });
});
