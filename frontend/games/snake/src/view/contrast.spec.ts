import { THEMES } from "@fz/style/themes";
import { contrast, paint, rgbOf } from "@fz/style/testing";
import { BOARD_ROLES } from "../app/board/board_roles";
import { PALETTES } from "../testing/palettes";
import { type SnakePalette, snakePalette } from "./palette";

// What the snake is told apart by is held to 3:1, the bar for graphics,
// against both shades of square, in every palette.
describe("the board's contrast", () => {
  describe.each(THEMES)("in $name", ({ id }) => {
    const roles = PALETTES.palette(id);
    const palette = snakePalette(PALETTES.rolesIn(id, BOARD_ROLES));
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
        paint(PALETTES.role(id, "panel"), roles),
      );

      expect(rgbOf(palette.checker)).toEqual(wash.map(Math.round));
    });
  });
});
