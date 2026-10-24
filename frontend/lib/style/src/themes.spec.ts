import { THEMES, darkTheme, isThemeId } from "./themes.ts";

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

describe("darkTheme", () => {
  it("gives a light palette its dark partner", () => {
    expect(darkTheme("pastel")).toBe("midnight");
  });

  it("keeps a dark palette as it is", () => {
    expect(darkTheme("emerald")).toBe("emerald");
  });

  it("gives every palette a dark one", () => {
    const modes = THEMES.map(
      ({ id }) => THEMES.find((theme) => theme.id === darkTheme(id))?.mode,
    );

    expect(new Set(modes)).toEqual(new Set(["dark"]));
  });
});
