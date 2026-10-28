import path from "node:path";
import { THEMES } from "@fz/style/themes";
import {
  type Rgb,
  compileStylesheet,
  contrast,
  paint,
  paletteRoles,
} from "@fz/style/testing";
import { type SnakePalette, snakePalette } from "./palette";

// Built from `import.meta.dirname`, since jsdom's `URL` isn't Node's.
const GLOBAL = path.join(import.meta.dirname, "../app/styles/global.scss");

/** Returns a color Phaser takes as its red, green and blue. */
function rgbOf(color: number): Rgb {
  return [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff];
}

// What the snake is told apart by is held to 3:1, the bar for graphics,
// against both shades of square, in every palette.
describe("the board's contrast", () => {
  const palettes = paletteRoles(compileStylesheet(GLOBAL));

  describe.each(THEMES)("in $name", ({ id }) => {
    const roles = palettes.get(id) ?? new Map<string, string>();

    /** Returns one of the palette's roles, as the page sets it. */
    function role(name: string): string {
      const value = roles.get(name);
      if (value === undefined) throw new Error(`No --fz-${name} in ${id}`);
      return value;
    }

    const palette = snakePalette({
      panel: role("panel"),
      text: role("text"),
      accent: role("accent"),
      danger: role("danger"),
    });
    const squares = [
      ["plain", palette.board],
      ["checkered", palette.checker],
    ] as const;
    const parts: readonly (keyof SnakePalette)[] = ["snake", "head", "apple"];

    it.each(
      parts.flatMap((part) =>
        squares.map(([shade, square]) => [part, shade, square] as const),
      ),
    )("keeps the %s at 3:1 or more on a %s square", (part, _, square) => {
      expect(
        contrast(rgbOf(palette[part]), rgbOf(square)),
      ).toBeGreaterThanOrEqual(3);
    });

    it("checkers the board as the page's first wash does", () => {
      const wash = paint(
        "var(--fz-wash-1)",
        roles,
        paint(role("panel"), roles),
      );

      expect(rgbOf(palette.checker)).toEqual(wash.map(Math.round));
    });
  });
});
