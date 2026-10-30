import { TestBed } from "@angular/core/testing";
import type { ThemeId } from "@fz/style/themes";
import { ThemeService } from "@fz/ui/theme";
import { bricksPalette } from "../../view/palette";
import { fieldPalette } from "./field_palette";

/** The colors the page gives the field, as a palette's stylesheet would. */
const ROLES = {
  panel: "#f1f3f5",
  text: "#1f2328",
  accent: "#2a7a3a",
  danger: "#c0392b",
  warning: "#b8860b",
};

/** Returns the theme with a palette applied to the page. */
function themeIn(id: ThemeId): ThemeService {
  const theme = TestBed.inject(ThemeService);
  theme.select(id);
  TestBed.tick();
  return theme;
}

describe("fieldPalette", () => {
  beforeEach(() => {
    for (const [role, color] of Object.entries(ROLES)) {
      document.documentElement.style.setProperty(`--fz-${role}`, color);
    }
  });

  afterEach(() => {
    document.documentElement.removeAttribute("style");
    localStorage.clear();
  });

  it("colors the field from a light palette's roles, in its light tints", () => {
    const palette = fieldPalette(themeIn("classic"));

    expect(palette()).toEqual(bricksPalette(ROLES, "light"));
  });

  it("colors the field from a dark palette's roles, in its dark tints", () => {
    const palette = fieldPalette(themeIn("midnight"));

    expect(palette()).toEqual(bricksPalette(ROLES, "dark"));
  });

  it("takes up a palette chosen once the field is colored", () => {
    const theme = themeIn("classic");
    const palette = fieldPalette(theme);
    palette();

    theme.select("midnight");
    TestBed.tick();

    expect(palette()).toEqual(bricksPalette(ROLES, "dark"));
  });
});
