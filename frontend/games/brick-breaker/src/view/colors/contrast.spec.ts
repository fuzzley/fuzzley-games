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

/** The contrast a hidden ghost keeps against the field: faint by design, as the art draws it, yet there to be found. */
const FAINT = 2;

// Everything a player follows, aims at or dodges is held to 3:1, the bar for
// graphics, against the field, in every palette, the paddle's caps, its hooks
// and its cannons among it, a bad capsule's gold lip, which says it pays
// double, the sparks about a ball at the streak's top multiplier and a
// seeking ball's sight, each outlined as a ball is, and so is the last
// bricks' glow; the wall, which only frames the field, is left at a wash of
// the text, as Snake's is. A ball or a capsule crosses bricks too, and its
// color can't also clear every tint: the tints and the warning and danger
// colors all sit on the same side of the field, so a color 3:1 from both the
// field and a tint would need 9:1 from the field, which only the text
// reaches. So each is outlined, in a color held to 3:1 against everything it
// crosses. The marks that tell a brick's kind and state apart, a ball's kind,
// and a capsule's symbol are held to 3:1 against what they are drawn on: the
// marks' color against every brick, a moss cap and a shown ghost among them,
// steel's frame and rivets against the steel, and a blast brick's spark
// against the mark it is lit on; the bolts in the paddle's caps are the
// marks' color too. A hidden ghost is held only to FAINT, since it is meant
// to be hard to see, and a brick's shading (its lip and strip, steel's sheen,
// a gift's ribbon, the moss's shadows), the paddle's (its lip and pad) and a
// good capsule's (its lip and shine) to nothing, since none tells a kind: a
// gift's bow is outlined in the marks' color.
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
    const shownGhosts = palette.ghostTints.shown.map(
      (tint, i) => [`shown ghost's tint ${String(i + 1)}`, tint] as const,
    );
    const hiddenGhosts = palette.ghostTints.hidden.map(
      (tint, i) => [`hidden ghost's tint ${String(i + 1)}`, tint] as const,
    );
    const outlined = [
      ...named(palette.balls, "ball"),
      ...named(palette.capsules, "capsule"),
    ];
    const crossed = [
      ...tints,
      ...toughTints,
      ...shownGhosts,
      ...named(palette.bricks, "brick"),
      ["moss", palette.kindInks.moss] as const,
      ["paddle", palette.paddle] as const,
      ["paddle's caps", palette.paddleInks.cap] as const,
    ];
    const paddleMarks = [
      ["paddle's hooks", palette.paddleInks.hook] as const,
      ["cannons and their bolts", palette.paddleInks.cannon] as const,
    ];
    const capsuleMarks = [
      ["bad capsule's gold lip", palette.capsuleLips.bad] as const,
    ];
    const ballMarks = [
      ["sparks about a ball at ×4", palette.streakSparks] as const,
      ["seeking ball's sight", palette.capsules.good] as const,
    ];

    it.each([
      ...crossed,
      ...outlined,
      ...paddleMarks,
      ...capsuleMarks,
      ...ballMarks,
      ["glow", palette.glow] as const,
    ])("keeps the %s at 3:1 or more against the field", (_, color) => {
      expect(
        contrast(rgbOf(color), rgbOf(palette.field)),
      ).toBeGreaterThanOrEqual(3);
    });

    it.each(hiddenGhosts)(
      "keeps the %s at 2:1 or more against the field, faint but there",
      (_, color) => {
        expect(
          contrast(rgbOf(color), rgbOf(palette.field)),
        ).toBeGreaterThanOrEqual(FAINT);
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

    it("keeps steel's frame and rivets at 3:1 or more against the steel", () => {
      expect(
        contrast(
          rgbOf(palette.kindInks.steelLine),
          rgbOf(palette.bricks.steel),
        ),
      ).toBeGreaterThanOrEqual(3);
    });

    it("keeps a blast brick's spark at 3:1 or more against the marks it is lit on", () => {
      expect(
        contrast(rgbOf(palette.kindInks.spark), rgbOf(palette.mark)),
      ).toBeGreaterThanOrEqual(3);
    });
  });
});
