import path from "node:path";
import { THEMES } from "@fz/style/themes";
import {
  type Rgb,
  compileStylesheet,
  contrast,
  paletteRoles,
} from "@fz/style/testing";
import { bricksPalette } from "./palette";

// Built from `import.meta.dirname`, since jsdom's `URL` isn't Node's.
const GLOBAL = path.join(import.meta.dirname, "../app/styles/global.scss");

/** Returns a color Phaser takes as its red, green and blue. */
function rgbOf(color: number): Rgb {
  return [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff];
}

/** Returns a record's entries, each named by its key and what it is. */
function named(
  record: Readonly<Record<string, number>>,
  what: string,
): readonly (readonly [string, number])[] {
  return Object.entries(record).map(([key, color]) => [
    `${key} ${what}`,
    color,
  ]);
}

// Everything a player follows, aims at or dodges is held to 3:1, the bar for
// graphics, against the field, in every palette; the wall, which only frames
// the field, is left at a wash of the text, as Snake's is. A ball or a
// capsule crosses bricks too, and its color can't also clear every tint: the
// tints and the warning and danger colors all sit on the same side of the
// field, so a color 3:1 from both the field and a tint would need 9:1 from
// the field, which only the text reaches. So each is outlined, in a color
// held to 3:1 against everything it crosses.
describe("the field's contrast", () => {
  const palettes = paletteRoles(compileStylesheet(GLOBAL));

  describe.each(THEMES)("in $name", ({ id, mode }) => {
    const roles = palettes.get(id) ?? new Map<string, string>();

    /** Returns one of the palette's roles, as the page sets it. */
    function role(name: string): string {
      const value = roles.get(name);
      if (value === undefined) throw new Error(`No --fz-${name} in ${id}`);
      return value;
    }

    const palette = bricksPalette(
      {
        panel: role("panel"),
        text: role("text"),
        accent: role("accent"),
        danger: role("danger"),
        warning: role("warning"),
      },
      mode,
    );
    // Numbered from 1, as a level's tints are.
    const tints = palette.tints.map(
      (tint, i) => [`tint ${String(i + 1)}`, tint] as const,
    );
    const outlined = [
      ...named(palette.balls, "ball"),
      ...named(palette.capsules, "capsule"),
    ];
    const crossed = [
      ...tints,
      ...named(palette.bricks, "brick"),
      ["paddle", palette.paddle] as const,
    ];

    it.each([...crossed, ...outlined])(
      "keeps the %s at 3:1 or more against the field",
      (_, color) => {
        expect(
          contrast(rgbOf(color), rgbOf(palette.field)),
        ).toBeGreaterThanOrEqual(3);
      },
    );

    it.each(outlined)(
      "keeps the %s at 3:1 or more against its outline",
      (_, color) => {
        expect(
          contrast(rgbOf(color), rgbOf(palette.outline)),
        ).toBeGreaterThanOrEqual(3);
      },
    );

    it.each(crossed)(
      "keeps the outline at 3:1 or more against the %s",
      (_, color) => {
        expect(
          contrast(rgbOf(palette.outline), rgbOf(color)),
        ).toBeGreaterThanOrEqual(3);
      },
    );
  });
});
