import { TINT, type TintName, inkAt } from "@fz/brick-wall/view/inks";
import {
  type PaletteRoles,
  wallPalette as wallColors,
} from "@fz/brick-wall/view/palette";
import { FUZZBALL_INKS, TILE_INKS, mixColors } from "@fz/phaser/color";
import type { ColorMode } from "@fz/style/themes";
import { wallPalette } from "./palette";

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

const DARK_ROLES: PaletteRoles = {
  field: "#202020",
  fieldLine: "#303030",
  fieldText: "#f0f0f0",
  fieldMuted: "#a0a0a0",
  page: "#181818",
  accent: "#55ccff",
  danger: "#ff8080",
  warning: "#ffcc00",
};

/** Three fifths of {@link ROLES}' text over its field. */
const STEEL = 0x6e6e6e;

/** Returns a tile's ink by its name, in a light palette unless another mode is named. */
function ink(name: TintName, mode: ColorMode = "light"): number {
  return inkAt(TILE_INKS[mode], TINT[name]);
}

describe("wallPalette", () => {
  it.each(["light", "dark"] as const)(
    "takes the colors every wall game draws in, in a %s palette",
    (mode) => {
      expect(wallPalette(ROLES, mode)).toMatchObject(wallColors(ROLES, mode));
    },
  );

  it("lights the meter's pips in the warning color and leaves them unlit in the field's muted text", () => {
    expect(wallPalette(ROLES, "light").meter).toEqual({
      on: 0xffa500,
      off: 0x707070,
    });
  });

  it("lays the gauge's plate in the band's wash, as the lintel is, rimmed in three fifths of the field's muted text over the field", () => {
    const palette = wallPalette(ROLES, "light");

    expect(palette.gauge).toEqual({ plate: palette.band, rim: 0xa7a7a7 });
  });

  it.each(["light", "dark"] as const)(
    "gives the friends the fuzzballs' %s inks in a palette of that mode",
    (mode) => {
      expect(wallPalette(ROLES, mode).friends).toBe(FUZZBALL_INKS[mode]);
    },
  );

  it("draws a steel brick in steel, its frame and rivets cut out of it", () => {
    expect(wallPalette(ROLES, "light").kinds.steel).toEqual({
      body: STEEL,
      face: STEEL,
      glyph: 0xfafafa,
    });
  });

  it.each(["rowZapper", "columnZapper", "crossZapper", "xZapper"] as const)(
    "draws a %s as a tile in the field's line, outlined and struck through in the warning color",
    (kind) => {
      expect(wallPalette(ROLES, "light").kinds[kind]).toEqual({
        body: 0xffa500,
        face: 0xd0d0d0,
        glyph: 0xffa500,
      });
    },
  );

  it("draws a bomb in the danger color and a bumper in the accent, each glyph cut out of it", () => {
    const { bomb, bumper } = wallPalette(ROLES, "light").kinds;

    expect([bomb, bumper]).toEqual([
      { body: 0xff0000, face: 0xff0000, glyph: 0xfafafa },
      { body: 0x00aa00, face: 0x00aa00, glyph: 0xfafafa },
    ]);
  });

  it("knits a wool brick in pink, its stitches cut out of it", () => {
    expect(wallPalette(ROLES, "light").kinds.wool).toEqual({
      body: ink("pink"),
      face: ink("pink"),
      glyph: 0xfafafa,
    });
  });

  it("draws a plated brick in orange, each plate of steel standing on the field", () => {
    expect(wallPalette(ROLES, "light").kinds.plated).toEqual({
      body: ink("orange"),
      face: 0xfafafa,
      glyph: STEEL,
    });
  });

  it("draws a cage in steel, its bars of steel over an inside of a fifth of steel", () => {
    expect(wallPalette(ROLES, "light").kinds.cage).toEqual({
      body: STEEL,
      face: 0xdddddd,
      glyph: STEEL,
    });
  });

  it("edges a prism's glass in more than half the field's text, the glass in a wash of it, and draws its triangle in it", () => {
    expect(wallPalette(ROLES, "light").kinds.prism).toEqual({
      body: 0x727272,
      face: 0xdedede,
      glyph: 0x101010,
    });
  });

  it("casts a prism's rays in red, amber and blue", () => {
    expect(wallPalette(ROLES, "light").rays).toEqual([
      ink("red"),
      ink("amber"),
      ink("blue"),
    ]);
  });

  it("rings the first pair of portals in violet and the second in teal, round the page, their arms a third of the way to the field's text", () => {
    expect(wallPalette(ROLES, "light").portals).toEqual([
      {
        body: ink("violet"),
        face: 0xeeeeee,
        glyph: mixColors(0x101010, ink("violet"), 0.34),
      },
      {
        body: ink("teal"),
        face: 0xeeeeee,
        glyph: mixColors(0x101010, ink("teal"), 0.34),
      },
    ]);
  });

  it("draws a shell brick's shell in teal round a core darkened toward black in a light palette", () => {
    expect(wallPalette(ROLES, "light").kinds.shell).toEqual({
      body: ink("teal"),
      face: mixColors(0x000000, ink("teal"), 0.42),
      glyph: 0xfafafa,
    });
  });

  it("draws a shell brick's shell lightened toward white round a core in teal in a dark palette", () => {
    expect(wallPalette(DARK_ROLES, "dark").kinds.shell).toEqual({
      body: mixColors(0xffffff, ink("teal", "dark"), 0.42),
      face: ink("teal", "dark"),
      glyph: 0x202020,
    });
  });

  it.each([
    ["light", ROLES, 0.12, 0xfafafa],
    ["dark", DARK_ROLES, 0.3, 0x202020],
  ] as const)(
    "draws a moss brick in amber under a cap of green lightened toward white in a %s palette",
    (mode, roles, light, mark) => {
      expect(wallPalette(roles, mode).kinds.moss).toEqual({
        body: ink("amber", mode),
        face: mixColors(0xffffff, ink("green", mode), light),
        glyph: mark,
      });
    },
  );
});
