import path from "node:path";
import { THEMES } from "@fz/style/themes";
import {
  type Rgb,
  compileStylesheet,
  contrast,
  paint,
  paletteRoles,
  rgb,
} from "@fz/style/testing";

// Paths are built from `import.meta.dirname`, since jsdom's `URL` isn't
// Node's.
const GLOBAL = path.join(import.meta.dirname, "../styles/global.scss");
const BOARD = path.join(import.meta.dirname, "board.component.scss");

/** Returns each shade's background, by its name, as the board sets them. */
function shades(css: string): ReadonlyMap<string, string> {
  return new Map(
    Array.from(
      css.matchAll(
        /\.cell\[data-shade=["']?(\w+)["']?\]\s*\{[^}]*?background:\s*([^;]+);/g,
      ),
      ([, name = "", background = ""]) => [name, background.trim()],
    ),
  );
}

/** Returns the player's ink, light and dark, as the board's mixin sets it. */
function entryInk(css: string): { light: string; dark: string } {
  const [, light = "", dark = ""] =
    /--ink-entry:\s*light-dark\((#\w+),\s*(#\w+)\)/.exec(css) ?? [];
  return { light, dark };
}

// Digits and notes are held to 4.5:1, the bar for text, on every shading a
// square can have; the lines and the selection's outline, graphics, to 3:1.
describe("the board's contrast", () => {
  const palettes = paletteRoles(compileStylesheet(GLOBAL));
  const board = compileStylesheet(BOARD);
  const backgrounds = shades(board);
  const ink = entryInk(board);

  it("reads a background for every shade", () => {
    expect([...backgrounds.keys()].sort()).toEqual([
      "hinted",
      "pattern",
      "related",
      "same",
      "selected",
      "unit",
    ]);
  });

  describe.each(THEMES)("in $name", ({ id, mode }) => {
    const roles = palettes.get(id) ?? new Map<string, string>();

    /** Returns one of the palette's roles, which is opaque. */
    function role(name: string): Rgb {
      return paint(`var(--fz-${name})`, roles);
    }

    const panel = role("panel");
    const squares: readonly (readonly [string, Rgb])[] = [
      ["plain", panel],
      ...Array.from(
        backgrounds,
        ([name, background]) =>
          [name, paint(background, roles, panel)] as const,
      ),
    ];

    it.each(squares)(
      "keeps a given at 4.5:1 or more on a %s square",
      (_, square) => {
        expect(contrast(role("text"), square)).toBeGreaterThanOrEqual(4.5);
      },
    );

    it.each(squares)(
      "keeps the player's digit at 4.5:1 or more on a %s square",
      (_, square) => {
        expect(contrast(rgb(ink[mode]), square)).toBeGreaterThanOrEqual(4.5);
      },
    );

    // Notes are in the text's color too, which the givens' case covers.
    it("keeps the selected square's digit among notes at 4.5:1 or more", () => {
      expect(
        contrast(role("on-accent"), role("accent")),
      ).toBeGreaterThanOrEqual(4.5);
    });

    // A square with a marked digit is never shaded.
    it("keeps a marked digit at 4.5:1 or more on its square", () => {
      expect(contrast(role("danger"), panel)).toBeGreaterThanOrEqual(4.5);
    });

    it("keeps the lines between the boxes at 3:1 or more", () => {
      expect(contrast(role("muted"), panel)).toBeGreaterThanOrEqual(3);
    });

    it.each(["selected", "hinted"])(
      "keeps the selection's outline at 3:1 or more on a %s square",
      (name) => {
        const square = paint(backgrounds.get(name) ?? "", roles, panel);

        expect(contrast(role("accent"), square)).toBeGreaterThanOrEqual(3);
      },
    );
  });
});
