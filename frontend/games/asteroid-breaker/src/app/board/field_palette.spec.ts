import { TestBed } from "@angular/core/testing";
import type { ThemeId } from "@fz/style/themes";
import { ThemeService } from "@fz/ui/theme";
import { ROLES, paintRoles } from "../../testing/roles";
import { beltPalette } from "../../view/palette";
import { fieldPalette } from "./field_palette";

/** Returns the theme with a palette applied to the page. */
function themeIn(id: ThemeId): ThemeService {
  const theme = TestBed.inject(ThemeService);
  theme.select(id);
  TestBed.tick();
  return theme;
}

describe("fieldPalette", () => {
  beforeEach(() => {
    paintRoles();
  });

  afterEach(() => {
    document.documentElement.removeAttribute("style");
    Reflect.deleteProperty(document.documentElement.dataset, "theme");
  });

  it("colors the field from a light palette's roles, in its light inks", () => {
    const palette = fieldPalette(themeIn("classic"));

    expect(palette()).toEqual(beltPalette(ROLES, "light"));
  });

  it("colors the field from a dark palette's roles, in its dark inks", () => {
    const palette = fieldPalette(themeIn("midnight"));

    expect(palette()).toEqual(beltPalette(ROLES, "dark"));
  });

  it("keeps a light palette's inks until a dark one is on the page", () => {
    const theme = themeIn("classic");
    const palette = fieldPalette(theme);

    theme.select("midnight");

    expect(palette()).toEqual(beltPalette(ROLES, "light"));
  });

  it("takes up a palette chosen once the field is colored", () => {
    const theme = themeIn("classic");
    const palette = fieldPalette(theme);
    palette();

    theme.select("midnight");
    TestBed.tick();

    expect(palette()).toEqual(beltPalette(ROLES, "dark"));
  });
});
