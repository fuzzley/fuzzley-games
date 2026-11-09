import { TestBed } from "@angular/core/testing";
import { THEMES, type ThemeId } from "@fz/style/themes";
import { ThemeService } from "@fz/ui/theme";
import { paintRoles } from "@fz/style/testing";
import { PALETTES, ROLES } from "../../testing/roles";
import { bricksPalette } from "../../view/colors/palette";
import { fieldPalette } from "./field_palette";
import { FIELD_ROLES } from "./field_roles";

/** Returns the theme with a palette applied to the page. */
function themeIn(id: ThemeId): ThemeService {
  const theme = TestBed.inject(ThemeService);
  theme.select(id);
  TestBed.tick();
  return theme;
}

describe("fieldPalette", () => {
  beforeEach(() => {
    paintRoles(FIELD_ROLES, ROLES);
  });

  afterEach(() => {
    Reflect.deleteProperty(document.documentElement.dataset, "theme");
  });

  it("colors the field from a light palette's roles, in its light tints", () => {
    const palette = fieldPalette(themeIn("classic"));

    expect(palette()).toEqual(bricksPalette(ROLES, "light"));
  });

  it("colors the field from a dark palette's roles, in its dark tints", () => {
    const palette = fieldPalette(themeIn("midnight"));

    expect(palette()).toEqual(bricksPalette(ROLES, "dark"));
  });

  it("keeps a light palette's tints until a dark one is on the page", () => {
    const theme = themeIn("classic");
    const palette = fieldPalette(theme);

    theme.select("midnight");

    expect(palette()).toEqual(bricksPalette(ROLES, "light"));
  });

  it("takes up a palette chosen once the field is colored, its roles and its tints", () => {
    const theme = themeIn("classic");
    const palette = fieldPalette(theme);
    palette();

    theme.select("midnight");
    paintRoles(FIELD_ROLES, PALETTES.rolesIn("midnight", FIELD_ROLES));
    TestBed.tick();

    expect(palette()).toEqual(
      bricksPalette(PALETTES.rolesIn("midnight", FIELD_ROLES), "dark"),
    );
  });

  // The roles are named here by hand, apart from `FIELD_ROLES`, so a role
  // named wrongly there shows.
  it.each(THEMES)("draws the field in $name's own roles", ({ id, mode }) => {
    paintRoles(FIELD_ROLES, PALETTES.rolesIn(id, FIELD_ROLES));

    const palette = fieldPalette(themeIn(id));

    expect(palette()).toEqual(
      bricksPalette(
        {
          panel: PALETTES.role(id, "panel"),
          text: PALETTES.role(id, "text"),
          accent: PALETTES.role(id, "accent"),
          danger: PALETTES.role(id, "danger"),
          warning: PALETTES.role(id, "warning"),
        },
        mode,
      ),
    );
  });
});
