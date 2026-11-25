import {
  FIELD_ROLES as WALL_ROLES,
  wallPalette as wallColors,
} from "@fz/brick-wall/view/palette";
import { TINT } from "@fz/brick-wall/view/inks";
import { TILE_INKS, mixColors } from "@fz/phaser/color";
import { FIELD_ROLES, type PaletteRoles, wallPalette } from "./palette";

// Each role differs from the others, from white and black, and from every
// color mixed from them, so a color drawn from the wrong one shows.
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
  it.each(["light", "dark"] as const)(
    "takes the colors every wall game draws in, in a %s palette",
    (mode) => {
      expect(wallPalette(ROLES, mode)).toMatchObject(wallColors(ROLES, mode));
    },
  );

  it("leaves a floor bounce's spring grey in the field's muted text until it is earned, and lights it in the warning color while it is held", () => {
    expect(wallPalette(ROLES, "light").springs).toEqual({
      off: 0x707070,
      on: 0xffa500,
    });
  });

  it.each([
    ["light", 0.65],
    ["dark", 0.55],
  ] as const)(
    "draws the rally's number in the field's text, at a %s palette's strength, %f",
    (mode, alpha) => {
      expect(wallPalette(ROLES, mode).rally).toEqual({
        color: 0x101010,
        alpha,
      });
    },
  );

  it("rings the guide's turns in the guide's color, the field's text", () => {
    expect(wallPalette(ROLES, "light").guideRing).toBe(0x101010);
  });

  it("draws a hatch's chevrons and an open hatch's posts in the field's muted text", () => {
    expect(wallPalette(ROLES, "light").chevrons).toBe(0x707070);
  });

  it("streaks the dash home in the fuzzball's accent, or a hot shot's danger color", () => {
    expect(wallPalette(ROLES, "light").streak).toEqual({
      plain: 0x00aa00,
      hot: 0xff0000,
    });
  });

  it("draws a portal's eye in the page's color", () => {
    expect(wallPalette(ROLES, "dark").portalEye).toBe(0xeeeeee);
  });

  it.each([
    ["light", 0.12],
    ["dark", 0.3],
  ] as const)(
    "draws a moss brick's cap in the green tile's ink of a %s palette with %f of white over it",
    (mode, white) => {
      expect(wallPalette(ROLES, mode).mossCap).toBe(
        mixColors(0xffffff, TILE_INKS[mode][TINT.green] ?? NaN, white),
      );
    },
  );
});

describe("FIELD_ROLES", () => {
  it("reads the field's colors by the library's roles", () => {
    expect(FIELD_ROLES).toEqual(WALL_ROLES);
  });
});
