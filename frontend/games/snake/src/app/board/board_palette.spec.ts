import path from "node:path";
import { TestBed } from "@angular/core/testing";
import { keysOf, recordOf } from "@fz/core/records";
import { type PaletteRole, THEMES, type ThemeId } from "@fz/style/themes";
import { compileStylesheet, paletteRoles } from "@fz/style/testing";
import { ThemeService } from "@fz/ui/theme";
import { type PaletteRoles, snakePalette } from "../../view/palette";
import { boardPalette } from "./board_palette";
import { BOARD_ROLES } from "./board_roles";

// Built from `import.meta.dirname`, since jsdom's `URL` isn't Node's.
const GLOBAL = path.join(import.meta.dirname, "../styles/global.scss");

/** Returns the theme with a palette applied to the page. */
function themeIn(id: ThemeId): ThemeService {
  const theme = TestBed.inject(ThemeService);
  theme.select(id);
  TestBed.tick();
  return theme;
}

describe("boardPalette", () => {
  const palettes = paletteRoles(compileStylesheet(GLOBAL));

  afterEach(() => {
    document.documentElement.removeAttribute("style");
    Reflect.deleteProperty(document.documentElement.dataset, "theme");
  });

  /** Returns one of a palette's roles, as its stylesheet sets it. */
  function role(id: ThemeId, name: PaletteRole): string {
    const value = palettes.get(id)?.get(name);
    if (value === undefined) throw new Error(`No --fz-${name} in ${id}`);
    return value;
  }

  /** Gives the page a palette's roles, as its stylesheet would. */
  function paintPalette(id: ThemeId): void {
    for (const [name, value] of palettes.get(id) ?? []) {
      document.documentElement.style.setProperty(`--fz-${name}`, value);
    }
  }

  /** Returns the colors a palette gives the board, through `BOARD_ROLES`. */
  function boardRolesIn(id: ThemeId): PaletteRoles {
    return recordOf(keysOf(BOARD_ROLES), (key) => role(id, BOARD_ROLES[key]));
  }

  // The roles are named here by hand, apart from `BOARD_ROLES`, so a role
  // named wrongly there shows.
  it.each(THEMES)("draws the board in $name's own roles", ({ id }) => {
    paintPalette(id);

    const palette = boardPalette(themeIn(id));

    expect(palette()).toEqual(
      snakePalette({
        panel: role(id, "panel"),
        text: role(id, "text"),
        accent: role(id, "accent"),
        danger: role(id, "danger"),
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

    expect(palette()).toEqual(snakePalette(boardRolesIn("midnight")));
  });
});
