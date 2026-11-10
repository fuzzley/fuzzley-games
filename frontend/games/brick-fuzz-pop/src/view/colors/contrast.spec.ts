import { colorNumber } from "@fz/phaser/color";
import { THEMES } from "@fz/style/themes";
import { contrast, rgbOf } from "@fz/style/testing";
import { PALETTES } from "../../testing/roles";
import { FIELD_ROLES, type KindInks, wallPalette } from "./palette";

/** The contrast a graphic keeps against what it is drawn on, as WCAG asks of graphics. */
const GRAPHIC = 3;

/** A color, named for what it draws. */
type Named = readonly [string, number];

/** Returns the contrast between two colors Phaser takes. */
function between(one: number, other: number): number {
  return contrast(rgbOf(one), rgbOf(other));
}

// Everything a player aims at, follows or tells a kind by keeps 3:1, the bar
// for graphics, against the field, in every palette: each tint, each special
// kind's body, every fuzzball, the sparks, the guide, the jump and danger
// lines and the meter. A kind's glyph keeps 3:1 against the face it is drawn
// on, and against the field too unless it is cut out in the field's color.
// The marks are cut out in the field's color, so they keep 3:1 against
// every ink they are cut from, a fuzzball's eyes against each fuzzball. A
// friend keeps 3:1 against the bar, where the crew waits, and against a
// cage's inside, where it waits to be freed; and the fuzzball and its meter,
// which wait on the floor, against the floor's band.
describe("the field's contrast", () => {
  describe.each(THEMES)("in $name", ({ id, mode }) => {
    const palette = wallPalette(PALETTES.rolesIn(id, FIELD_ROLES), mode);
    const bar = colorNumber(PALETTES.role(id, "bar"));
    const tints = palette.tints.map((ink, tint): Named => [
      `tint ${String(tint)}`,
      ink,
    ]);
    const kinds: readonly (readonly [string, KindInks])[] = [
      ...Object.entries(palette.kinds),
      ...palette.portals.map(
        (inks, pair) => [`portal of pair ${String(pair + 1)}`, inks] as const,
      ),
    ];
    const bodies = kinds.map(([kind, { body }]): Named => [
      `${kind}'s body`,
      body,
    ]);
    const friends = palette.friends.map((ink, i): Named => [
      `friend's ink ${String(i)}`,
      ink,
    ]);
    const fuzzballs: readonly Named[] = [
      ["fuzzball", palette.fuzzball],
      ["hot shot", palette.hotShot],
      ...friends,
    ];
    const meter: readonly Named[] = [
      ["meter's lit pips", palette.meter.on],
      ["meter's unlit pips", palette.meter.off],
    ];

    it.each([
      ...tints,
      ...bodies,
      ...fuzzballs,
      ["sparks", palette.spark],
      ["guide", palette.guide],
      ["jump line", palette.jumpLine],
      ["danger line", palette.dangerLine],
      ...meter,
    ] as const)("keeps the %s at 3:1 or more against the field", (_, color) => {
      expect(between(color, palette.field)).toBeGreaterThanOrEqual(GRAPHIC);
    });

    it.each(kinds)(
      "keeps the %s's glyph at 3:1 or more against its face",
      (_, { glyph, face }) => {
        expect(between(glyph, face)).toBeGreaterThanOrEqual(GRAPHIC);
      },
    );

    it.each(kinds.filter(([, { glyph }]) => glyph !== palette.mark))(
      "keeps the %s's glyph, which isn't cut out, at 3:1 or more against the field",
      (_, { glyph }) => {
        expect(between(glyph, palette.field)).toBeGreaterThanOrEqual(GRAPHIC);
      },
    );

    const [red, amber, blue] = palette.rays;

    it.each([
      ["red", red],
      ["amber", amber],
      ["blue", blue],
    ] as const)(
      "keeps a prism's %s ray at 3:1 or more against its glass",
      (_, ray) => {
        expect(between(ray, palette.kinds.prism.face)).toBeGreaterThanOrEqual(
          GRAPHIC,
        );
      },
    );

    it("keeps a cross zapper's diamond, in the field's text, at 3:1 or more against its tile", () => {
      expect(
        between(palette.text, palette.kinds.crossZapper.face),
      ).toBeGreaterThanOrEqual(GRAPHIC);
    });

    it.each([...tints, ...bodies, ...fuzzballs])(
      "keeps the marks at 3:1 or more against the %s",
      (_, color) => {
        expect(between(palette.mark, color)).toBeGreaterThanOrEqual(GRAPHIC);
      },
    );

    it.each(
      friends.flatMap(([name, color]) =>
        (
          [
            ["bar", bar],
            ["cage's inside", palette.kinds.cage.face],
          ] as const
        ).map(([surface, under]) => [name, surface, color, under] as const),
      ),
    )("keeps the %s at 3:1 or more against the %s", (_, __, color, under) => {
      expect(between(color, under)).toBeGreaterThanOrEqual(GRAPHIC);
    });

    it.each([
      ["fuzzball", palette.fuzzball],
      ["hot shot", palette.hotShot],
      ...meter,
    ] as const)(
      "keeps the %s at 3:1 or more against the floor's band",
      (_, color) => {
        expect(between(color, palette.band)).toBeGreaterThanOrEqual(GRAPHIC);
      },
    );
  });
});
