import { TILE_INKS } from "@fz/phaser/color";
import { FIELD_ROLES, type PaletteRoles, wallPalette } from "./palette";

// Each role differs from the others, from white and black, and from every
// color mixed from them, so a color mixed from the wrong ones shows.
const ROLES: PaletteRoles = {
  field: "#fafafa",
  fieldLine: "#d0d0d0",
  fieldText: "#101010",
  fieldMuted: "#707070",
  page: "#eeeeee",
  accent: "#00aa00",
  danger: "#ff0000",
  warning: "#ffa500",
};

describe("wallPalette", () => {
  it("lays the field in its color, framed in its line, the floor's band in a wash of its text, and cuts the marks out in its color", () => {
    const palette = wallPalette(ROLES, "light");

    expect([palette.field, palette.line, palette.band, palette.mark]).toEqual([
      0xfafafa, 0xd0d0d0, 0xdcdcdc, 0xfafafa,
    ]);
  });

  it("draws the fuzzball and the jump line in the accent, the hot shot and the danger line in the danger color, and the sparks in the warning color", () => {
    const palette = wallPalette(ROLES, "light");

    expect([
      palette.fuzzball,
      palette.jumpLine,
      palette.hotShot,
      palette.dangerLine,
      palette.spark,
    ]).toEqual([0x00aa00, 0x00aa00, 0xff0000, 0xff0000, 0xffa500]);
  });

  it("draws the guide in the field's text", () => {
    const palette = wallPalette(ROLES, "light");

    expect([palette.guide, palette.text]).toEqual([0x101010, 0x101010]);
  });

  it("mixes steel from three fifths of the field's text over the field", () => {
    expect(wallPalette(ROLES, "light").steel).toBe(0x6e6e6e);
  });

  it.each(["light", "dark"] as const)(
    "tints the bricks with the tiles' %s inks in a palette of that mode",
    (mode) => {
      expect(wallPalette(ROLES, mode).tints).toBe(TILE_INKS[mode]);
    },
  );
});

describe("FIELD_ROLES", () => {
  // The page's text, muted text and line may differ from the field's, as
  // the line does in a dark palette.
  it("reads each of the field's colors from the field's own role where the page has one", () => {
    expect(FIELD_ROLES).toEqual({
      field: "field",
      fieldLine: "field-line",
      fieldText: "field-text",
      fieldMuted: "field-muted",
      page: "page",
      accent: "accent",
      danger: "danger",
      warning: "warning",
    });
  });
});
