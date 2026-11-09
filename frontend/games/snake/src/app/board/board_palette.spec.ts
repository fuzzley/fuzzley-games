import { TestBed } from "@angular/core/testing";
import { THEMES, type ThemeId } from "@fz/style/themes";
import { paintRoles } from "@fz/style/testing";
import { ThemeService } from "@fz/ui/theme";
import { PALETTES } from "../../testing/palettes";
import { snakePalette } from "../../view/palette";
import { boardPalette } from "./board_palette";
import { BOARD_ROLES } from "./board_roles";

/** Returns the theme with a palette applied to the page. */
function themeIn(id: ThemeId): ThemeService {
  const theme = TestBed.inject(ThemeService);
  theme.select(id);
  TestBed.tick();
  return theme;
}

describe("boardPalette", () => {
  afterEach(() => {
    Reflect.deleteProperty(document.documentElement.dataset, "theme");
  });

  /** Gives the page the board's roles in a palette, as its stylesheet would. */
  function paintPalette(id: ThemeId): void {
    paintRoles(BOARD_ROLES, PALETTES.rolesIn(id, BOARD_ROLES));
  }

  // The roles are named here by hand, apart from `BOARD_ROLES`, so a role
  // named wrongly there shows.
  it.each(THEMES)("draws the board in $name's own roles", ({ id }) => {
    paintPalette(id);

    const palette = boardPalette(themeIn(id));

    expect(palette()).toEqual(
      snakePalette({
        panel: PALETTES.role(id, "panel"),
        text: PALETTES.role(id, "text"),
        accent: PALETTES.role(id, "accent"),
        danger: PALETTES.role(id, "danger"),
      }),
    );
  });

  it("takes up a palette chosen once the board is colored", () => {
    paintPalette("classic");
    const theme = themeIn("classic");
    const palette = boardPalette(theme);
    palette();

    theme.select("midnight");
    paintPalette("midnight");
    TestBed.tick();

    expect(palette()).toEqual(
      snakePalette(PALETTES.rolesIn("midnight", BOARD_ROLES)),
    );
  });
});
