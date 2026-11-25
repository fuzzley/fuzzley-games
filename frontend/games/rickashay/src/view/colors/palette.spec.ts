import {
  FIELD_ROLES as WALL_ROLES,
  wallPalette as wallColors,
} from "@fz/brick-wall/view/palette";
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
  onWarning: "#202000",
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

  it("carries the rally in a pill of the warning color, its number in the text the palette sets on that color", () => {
    expect(wallPalette(ROLES, "light").pill).toEqual({
      fill: 0xffa500,
      text: 0x202000,
    });
  });

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
});

describe("FIELD_ROLES", () => {
  it("reads every wall game's colors by the library's roles, and the rally's number by the text on the warning color", () => {
    expect(FIELD_ROLES).toEqual({ ...WALL_ROLES, onWarning: "on-warning" });
  });
});
