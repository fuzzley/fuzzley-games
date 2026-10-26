import path from "node:path";
import { compileString } from "sass";
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

/** Returns each number's ink, light and dark, as the board's mixin sets them. */
function inks(): ReadonlyMap<number, { light: string; dark: string }> {
  const { css } = compileString('@use "inks"; a { @include inks.inks; }', {
    loadPaths: [import.meta.dirname],
  });
  const found = new Map<number, { light: string; dark: string }>();
  for (const [, n = "", light = "", dark = ""] of css.matchAll(
    /--ink-(\d):\s*light-dark\((#\w+),\s*(#\w+)\)/g,
  )) {
    found.set(Number(n), { light, dark });
  }
  return found;
}

// Numbers and marks are held to 4.5:1, the bar for text, though WCAG asks
// only 3:1 of a graphic; a square's state is a graphic, held to 3:1.
describe("the board's contrast", () => {
  const palettes = paletteRoles(compileStylesheet(GLOBAL));
  const numberInks = inks();

  it("has an ink for every number", () => {
    expect([...numberInks.keys()]).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  describe.each(THEMES)("in $name", ({ id, mode }) => {
    const roles = palettes.get(id) ?? new Map<string, string>();

    /** Returns one of the palette's roles, which is opaque. */
    function role(name: string): Rgb {
      return paint(`var(--fz-${name})`, roles);
    }

    const board = role("panel");
    const open = paint("var(--fz-wash-1)", roles, board);
    const hidden = role("accent");

    it.each([1, 2, 3, 4, 5, 6, 7, 8])(
      "keeps the number %d at 4.5:1 or more on its square",
      (n) => {
        const ink = rgb(numberInks.get(n)?.[mode] ?? "");

        expect(contrast(ink, open)).toBeGreaterThanOrEqual(4.5);
      },
    );

    it("keeps a flag at 4.5:1 or more on its square", () => {
      expect(contrast(role("on-accent"), hidden)).toBeGreaterThanOrEqual(4.5);
    });

    it("keeps a mine stepped on at 4.5:1 or more on its square", () => {
      expect(
        contrast(role("on-danger"), role("danger")),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("keeps the mines and wrong flags shown after a loss at 4.5:1 or more", () => {
      expect(contrast(role("text"), open)).toBeGreaterThanOrEqual(4.5);
    });

    it("keeps the stroke through a wrong flag at 3:1 or more", () => {
      expect(contrast(role("danger"), open)).toBeGreaterThanOrEqual(3);
    });

    it("tells a hidden square from an open one at 3:1 or more", () => {
      expect(contrast(hidden, open)).toBeGreaterThanOrEqual(3);
    });

    it("keeps the focus ring at 3:1 or more against the board", () => {
      expect(contrast(role("text"), board)).toBeGreaterThanOrEqual(3);
    });
  });
});
