import { TestBed } from "@angular/core/testing";
import { THEMES, type ThemeId } from "@fz/style/themes";
import { ThemeService } from "@fz/ui/theme";
import {
  ROLES,
  fieldRolesIn,
  paintRoles,
  stylesheetRole,
} from "../../testing/roles";
import { beltPalette } from "../../view/colors/palette";
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

  it("takes up a palette chosen once the field is colored, its roles and its inks", () => {
    const theme = themeIn("classic");
    const palette = fieldPalette(theme);
    palette();

    theme.select("midnight");
    paintRoles(fieldRolesIn("midnight"));
    TestBed.tick();

    expect(palette()).toEqual(beltPalette(fieldRolesIn("midnight"), "dark"));
  });

  // The roles are named here by hand, apart from `FIELD_ROLES`, so a role
  // named wrongly there shows.
  it.each(THEMES)("draws the field in $name's own roles", ({ id, mode }) => {
    paintRoles(fieldRolesIn(id));

    const palette = fieldPalette(themeIn(id));

    expect(palette()).toEqual(
      beltPalette(
        {
          field: stylesheetRole(id, "field"),
          fieldLine: stylesheetRole(id, "field-line"),
          fieldText: stylesheetRole(id, "field-text"),
          fieldMuted: stylesheetRole(id, "field-muted"),
          accent: stylesheetRole(id, "accent"),
          onAccent: stylesheetRole(id, "on-accent"),
          danger: stylesheetRole(id, "danger"),
          warning: stylesheetRole(id, "warning"),
        },
        mode,
      ),
    );
  });
});
