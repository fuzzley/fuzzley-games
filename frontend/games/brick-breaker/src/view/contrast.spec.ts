import path from "node:path";
import { THEMES } from "@fz/style/themes";
import {
  type Rgb,
  compileStylesheet,
  contrast,
  paletteRoles,
} from "@fz/style/testing";
import { BALL_KIND_IDS } from "../rules/catalog/balls";
import { bricksPalette } from "./palette";

// Built from `import.meta.dirname`, since jsdom's `URL` isn't Node's.
const GLOBAL = path.join(import.meta.dirname, "../app/styles/global.scss");

/** Returns a color Phaser takes as its red, green and blue. */
function rgbOf(color: number): Rgb {
  return [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff];
}

// Everything a player follows, aims at or dodges is held to 3:1, the bar
// for graphics, against the field, in every palette. A ball's color can't
// also clear every tint: the fire ball's warning and the blast ball's danger
// sit as far from the field as the tints do. So every ball is outlined in the
// field's color, and a tint's 3:1 against the field holds the outline's too.
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
    const drawn: readonly (readonly [string, number])[] = [
      ...palette.tints.map((tint, i) => [`tint ${i}`, tint] as const),
      ["steel brick", palette.steel],
      ["blast brick", palette.blast],
      ["gift brick", palette.gift],
      ...BALL_KIND_IDS.map(
        (kind) => [`${kind} ball`, palette.balls[kind]] as const,
      ),
      ["good capsule", palette.capsules.good],
      ["bad capsule", palette.capsules.bad],
      ["paddle", palette.paddle],
    ];

    it.each(drawn)(
      "keeps the %s at 3:1 or more against the field",
      (_, color) => {
        expect(
          contrast(rgbOf(color), rgbOf(palette.field)),
        ).toBeGreaterThanOrEqual(3);
      },
    );
  });
});
