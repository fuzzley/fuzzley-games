import { THEMES } from "@fz/style/themes";
import { contrast, rgbOf } from "@fz/style/testing";
import { FIELD_ROLES } from "../../app/board/field_roles";
import { PALETTES } from "../../testing/roles";
import { bricksPalette } from "./palette";

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
// graphics, against the field, in every palette, and so is the last bricks'
// glow; the wall, which only frames the field, is left at a wash of the text,
// as Snake's is. A ball or a capsule crosses bricks too, and its color can't
// also clear every tint: the tints and the warning and danger colors all sit
// on the same side of the field, so a color 3:1 from both the field and a
// tint would need 9:1 from the field, which only the text reaches. So each is
// outlined, in a color held to 3:1 against everything it crosses. The marks that tell a brick's
// kind and state apart, a ball's kind, and a capsule's symbol, are held to
// 3:1 against what they are drawn on.
describe("the field's contrast", () => {
  describe.each(THEMES)("in $name", ({ id, mode }) => {
    const palette = bricksPalette(PALETTES.rolesIn(id, FIELD_ROLES), mode);
    // Numbered from 1, as a level's tints are.
    const tints = palette.tints.map(
      (tint, i) => [`tint ${String(i + 1)}`, tint] as const,
    );
    const toughTints = palette.toughTints.map(
      (tint, i) => [`tough tint ${String(i + 1)}`, tint] as const,
    );
    const outlined = [
      ...named(palette.balls, "ball"),
      ...named(palette.capsules, "capsule"),
    ];
    const crossed = [
      ...tints,
      ...toughTints,
      ...named(palette.bricks, "brick"),
      ["paddle", palette.paddle] as const,
    ];

    it.each([...crossed, ...outlined, ["glow", palette.glow] as const])(
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

    it.each([...crossed, ...outlined])(
      "keeps the marks at 3:1 or more against the %s",
      (_, color) => {
        expect(
          contrast(rgbOf(palette.mark), rgbOf(color)),
        ).toBeGreaterThanOrEqual(3);
      },
    );
  });
});
