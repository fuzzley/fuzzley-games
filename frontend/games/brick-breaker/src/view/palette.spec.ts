import { DARK_INKS, LIGHT_INKS } from "./inks";
import { type PaletteRoles, bricksPalette } from "./palette";

const ROLES: PaletteRoles = {
  panel: "#ffffff",
  text: "#000000",
  accent: "#00ff00",
  danger: "#ff0000",
  warning: "#ffa500",
};

describe("bricksPalette", () => {
  it("lays the field in the panel's color and the paddle in the accent", () => {
    const palette = bricksPalette(ROLES, "light");

    expect({ field: palette.field, paddle: palette.paddle }).toEqual({
      field: 0xffffff,
      paddle: 0x00ff00,
    });
  });

  it("draws a ball in the text, a fire ball in the warning color and a blast ball in the danger color", () => {
    const palette = bricksPalette(ROLES, "light");

    expect(palette.balls).toEqual({
      normal: 0x000000,
      fire: 0xffa500,
      blast: 0xff0000,
    });
  });

  it("draws a good capsule and a gift brick in the accent, a bad capsule and a blast brick in the danger color", () => {
    const palette = bricksPalette(ROLES, "light");

    expect({
      capsules: palette.capsules,
      gift: palette.gift,
      blast: palette.blast,
    }).toEqual({
      capsules: { good: 0x00ff00, bad: 0xff0000 },
      gift: 0x00ff00,
      blast: 0xff0000,
    });
  });

  it("washes the wall with a fifth of the text, and steel with more than half", () => {
    const palette = bricksPalette(ROLES, "light");

    expect({ wall: palette.wall, steel: palette.steel }).toEqual({
      wall: 0xcccccc,
      steel: 0x737373,
    });
  });

  it.each([
    ["light", LIGHT_INKS],
    ["dark", DARK_INKS],
  ] as const)(
    "tints the bricks with the %s inks in a palette of that mode",
    (mode, inks) => {
      expect(bricksPalette(ROLES, mode).tints).toBe(inks);
    },
  );
});
