import { FUZZBALL_INKS } from "@fz/phaser/color";
import { PILOT_COLORS } from "../../rules/ship/pilots";
import { DARK_ROCK_INKS, LIGHT_ROCK_INKS } from "./inks";
import { type PaletteRoles, beltPalette, pilotInk } from "./palette";

const ROLES: PaletteRoles = {
  field: "#fafafa",
  fieldLine: "#dddddd",
  fieldText: "#000000",
  fieldMuted: "#666666",
  accent: "#00aa00",
  onAccent: "#ffffff",
  danger: "#ff0000",
  warning: "#ffa500",
};

describe("beltPalette", () => {
  it("lays the field in its color, framed in its line, and outlines and marks what is on it in its color", () => {
    const palette = beltPalette(ROLES, "light");

    expect([
      palette.field,
      palette.line,
      palette.outline,
      palette.mark,
    ]).toEqual([0xfafafa, 0xdddddd, 0xfafafa, 0xfafafa]);
  });

  it("draws the ship and a pickup in the accent, its symbol in the accent's own text, and the flame in the warning color", () => {
    const palette = beltPalette(ROLES, "light");

    expect([palette.accent, palette.onAccent, palette.flame]).toEqual([
      0x00aa00, 0xffffff, 0xffa500,
    ]);
  });

  it("draws the shots in the field's text and the comet in the danger color", () => {
    const palette = beltPalette(ROLES, "light");

    expect([palette.shot, palette.comet]).toEqual([0x000000, 0xff0000]);
  });

  it("draws the specks in the field's muted text, faintly, and a stray's bubble and its rim in washes of its text", () => {
    const palette = beltPalette(ROLES, "light");

    expect([palette.speck, palette.bubble, palette.rim]).toEqual([
      0xc9c9c9, 0xebebeb, 0x7d7d7d,
    ]);
  });

  it("draws the stick's base and the buttons at rest in a wash of the field's text", () => {
    expect(beltPalette(ROLES, "light").deck).toBe(0xeeeeee);
  });

  it.each([
    ["light", LIGHT_ROCK_INKS],
    ["dark", DARK_ROCK_INKS],
  ] as const)(
    "takes the rocks' inks and the fuzzballs' of a %s palette",
    (mode, rocks) => {
      const palette = beltPalette(ROLES, mode);

      expect([palette.rocks, palette.core, palette.pilots]).toEqual([
        rocks.kinds,
        rocks.core,
        FUZZBALL_INKS[mode],
      ]);
    },
  );

  it.each(["light", "dark"] as const)(
    "gives each pilot's color an ink in a %s palette",
    (mode) => {
      expect(beltPalette(ROLES, mode).pilots).toHaveLength(PILOT_COLORS);
    },
  );

  it("draws the deck's symbols at rest in the field's muted text, and a bubble's glint in white", () => {
    const palette = beltPalette(ROLES, "light");

    expect([palette.muted, palette.glint]).toEqual([0x666666, 0xffffff]);
  });

  it("draws a pilot's eyes as the fuzzball has them", () => {
    expect(beltPalette(ROLES, "light").eyes).toBe(0x14171b);
  });
});

describe("pilotInk", () => {
  it.each([
    ["light", "#0f8378"],
    ["dark", "#3fd2c2"],
  ] as const)(
    "gives a pilot its ink in CSS hex of six digits in a %s palette",
    (mode, ink) => {
      expect(pilotInk(4, mode)).toBe(ink);
    },
  );

  it.each([-1, PILOT_COLORS])(
    "refuses color %i, which no pilot has",
    (pilot) => {
      expect(() => pilotInk(pilot, "light")).toThrow(RangeError);
    },
  );
});
