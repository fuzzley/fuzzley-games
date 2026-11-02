import path from "node:path";
import { THEMES } from "@fz/style/themes";
import {
  type Rgb,
  compileStylesheet,
  contrast,
  paletteRoles,
} from "@fz/style/testing";
import { colorNumber } from "@fz/phaser/color";
import { beltPalette } from "./palette";

// Built from `import.meta.dirname`, since jsdom's `URL` isn't Node's.
const GLOBAL = path.join(import.meta.dirname, "../app/styles/global.scss");

/** The contrast a graphic keeps against what it is drawn on, as WCAG asks of graphics. */
const GRAPHIC = 3;

/** Returns a color Phaser takes as its red, green and blue. */
function rgbOf(color: number): Rgb {
  return [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff];
}

/** Returns the contrast between two colors Phaser takes. */
function between(one: number, other: number): number {
  return contrast(rgbOf(one), rgbOf(other));
}

// Everything a player follows, aims at or dodges keeps 3:1, the bar for
// graphics, against the field, in every palette, and so does the flame,
// which shows the thrust, and a stray's bubble's rim, which tells it from a
// rock. Each thing is outlined in the field's color, so it reads apart from
// a rock it crosses, and a rock's marks are drawn in the same, so each keeps
// 3:1 against those too. Each pilot keeps 3:1 against what it is drawn on:
// the field, in the ship's window; a stray's bubble; and the bar, where the
// crew waits; and its eyes keep 3:1 against it. The deck's symbols at rest
// keep 3:1 against its buttons, and the knob against the stick's base.
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

    const palette = beltPalette(
      {
        field: role("field"),
        fieldLine: role("field-line"),
        fieldText: role("field-text"),
        fieldMuted: role("field-muted"),
        accent: role("accent"),
        onAccent: role("on-accent"),
        danger: role("danger"),
        warning: role("warning"),
      },
      mode,
    );
    const bar = colorNumber(role("bar"));
    const rocks = Object.entries(palette.rocks).map(
      ([kind, color]) => [`${kind} rock`, color] as const,
    );
    const outlined = [
      ...rocks,
      ["ship", palette.accent],
      ["pickup", palette.accent],
      ["comet", palette.comet],
    ] as const;
    const pilots = palette.pilots.map(
      (color, i) => [`pilot ${String(i + 1)}`, color] as const,
    );

    it.each([
      ...outlined,
      ["shots", palette.shot],
      ["flame", palette.flame],
      ["stray's bubble's rim", palette.rim],
    ] as const)("keeps the %s at 3:1 or more against the field", (_, color) => {
      expect(between(color, palette.field)).toBeGreaterThanOrEqual(GRAPHIC);
    });

    it.each(outlined)(
      "keeps the outline at 3:1 or more against the %s",
      (_, color) => {
        expect(between(palette.outline, color)).toBeGreaterThanOrEqual(GRAPHIC);
      },
    );

    it.each(rocks)(
      "keeps the marks at 3:1 or more against the %s",
      (_, color) => {
        expect(between(palette.mark, color)).toBeGreaterThanOrEqual(GRAPHIC);
      },
    );

    it("keeps a pickup's symbol at 3:1 or more against the pickup", () => {
      expect(between(palette.onAccent, palette.accent)).toBeGreaterThanOrEqual(
        GRAPHIC,
      );
    });

    it.each(
      pilots.flatMap(([name, color]) =>
        (
          [
            ["field", palette.field],
            ["stray's bubble", palette.bubble],
            ["bar", bar],
          ] as const
        ).map(([surface, under]) => [name, surface, color, under] as const),
      ),
    )("keeps %s at 3:1 or more against the %s", (_, __, color, under) => {
      expect(between(color, under)).toBeGreaterThanOrEqual(GRAPHIC);
    });

    it.each(pilots)("keeps the eyes at 3:1 or more against %s", (_, color) => {
      expect(between(palette.eyes, color)).toBeGreaterThanOrEqual(GRAPHIC);
    });

    it.each([
      ["a button's symbol at rest", palette.muted],
      ["the stick's knob", palette.accent],
    ] as const)("keeps %s at 3:1 or more against the deck", (_, color) => {
      expect(between(color, palette.deck)).toBeGreaterThanOrEqual(GRAPHIC);
    });
  });
});
