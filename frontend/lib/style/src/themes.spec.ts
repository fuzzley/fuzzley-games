import { THEMES, isThemeId } from "./themes.ts";

describe("THEMES", () => {
  it("gives every palette its own id", () => {
    const ids = THEMES.map((theme) => theme.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("recognizes a palette's id", () => {
    expect(isThemeId("midnight")).toBe(true);
  });

  it("rejects anything else as a palette's id", () => {
    expect(isThemeId("neon")).toBe(false);
  });
});
