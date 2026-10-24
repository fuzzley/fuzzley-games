import { DEFAULT_THEMES, THEMES, isThemeId } from "./themes.ts";

describe("THEMES", () => {
  it("gives every palette its own id", () => {
    const ids = THEMES.map((theme) => theme.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("defaults to a light palette in light mode and a dark one in dark", () => {
    const modeOf = (id: string): string | undefined =>
      THEMES.find((theme) => theme.id === id)?.mode;

    expect(modeOf(DEFAULT_THEMES.light)).toBe("light");
    expect(modeOf(DEFAULT_THEMES.dark)).toBe("dark");
  });

  it("recognizes a palette's id", () => {
    expect(isThemeId("midnight")).toBe(true);
  });

  it("rejects anything else as a palette's id", () => {
    expect(isThemeId("neon")).toBe(false);
  });
});
