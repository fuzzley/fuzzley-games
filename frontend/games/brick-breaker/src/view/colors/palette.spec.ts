import { TILE_INKS, mixColors } from "@fz/phaser/color";
import { TINTS } from "../../rules/levels/level";
import { type PaletteRoles, bricksPalette, tintAt } from "./palette";

const ROLES: PaletteRoles = {
  panel: "#ffffff",
  text: "#000000",
  accent: "#00ff00",
  danger: "#ff0000",
  warning: "#ffa500",
};

describe("bricksPalette", () => {
  it("lays the field in the panel's color, outlines and marks in the same, and draws the paddle in the accent", () => {
    const palette = bricksPalette(ROLES, "light");

    expect({
      field: palette.field,
      outline: palette.outline,
      mark: palette.mark,
      paddle: palette.paddle,
    }).toEqual({
      field: 0xffffff,
      outline: 0xffffff,
      mark: 0xffffff,
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

  it("sparks about a ball at the streak's top multiplier in the warning color", () => {
    expect(bricksPalette(ROLES, "light").streakSparks).toBe(0xffa500);
  });

  it("draws a good capsule and a gift brick in the accent, a bad capsule and a blast brick in the danger color", () => {
    const palette = bricksPalette(ROLES, "light");

    expect({
      capsules: palette.capsules,
      gift: palette.bricks.gift,
      blast: palette.bricks.blast,
    }).toEqual({
      capsules: { good: 0x00ff00, bad: 0xff0000 },
      gift: 0x00ff00,
      blast: 0xff0000,
    });
  });

  it("lays a good capsule on its accent at 30% black, with a shine at half white, and a bad one on gold, the warning color", () => {
    const palette = bricksPalette(ROLES, "light");

    expect({
      lips: palette.capsuleLips,
      shine: palette.capsuleShine,
    }).toEqual({
      lips: { good: mixColors(0x000000, 0x00ff00, 0.3), bad: 0xffa500 },
      shine: mixColors(0xffffff, 0x00ff00, 0.5),
    });
  });

  it.each([
    ["light", 0.45],
    ["dark", 0.6],
  ] as const)(
    "gives the paddle a lip at 32% black, caps toward the text, a pale pad, hooks in the text and cannons in the warning color, in a %s palette",
    (mode, cap) => {
      const { paddleInks } = bricksPalette({ ...ROLES, text: "#102030" }, mode);

      expect(paddleInks).toEqual({
        lip: mixColors(0x000000, 0x00ff00, 0.32),
        cap: mixColors(0x102030, 0x00ff00, cap),
        pad: mixColors(0xffffff, 0x00ff00, 0.55),
        hook: 0x102030,
        cannon: 0xffa500,
      });
    },
  );

  it("frames the last bricks' glow in the text", () => {
    expect(bricksPalette(ROLES, "light").glow).toBe(0x000000);
  });

  it("washes the wall with a fifth of the text, and steel with more than half", () => {
    const palette = bricksPalette(ROLES, "light");

    expect({ wall: palette.wall, steel: palette.bricks.steel }).toEqual({
      wall: 0xcccccc,
      steel: 0x737373,
    });
  });

  it("deepens a tough brick's tint 12% of the way to the text", () => {
    const palette = bricksPalette(ROLES, "light");

    expect(palette.toughTints[0]).toBe(
      mixColors(0x000000, TILE_INKS.light[0] ?? 0, 0.12),
    );
  });

  it.each(["light", "dark"] as const)(
    "lays a regrowing brick's earth in the amber tint, in a %s palette",
    (mode) => {
      expect(bricksPalette(ROLES, mode).bricks.regrow).toBe(TILE_INKS[mode][2]);
    },
  );

  it("frames steel and rivets it in the steel at 60% black, and sparks a blast brick in the warning color", () => {
    const palette = bricksPalette(ROLES, "light");

    expect({
      steelLine: palette.kindInks.steelLine,
      spark: palette.kindInks.spark,
    }).toEqual({
      steelLine: mixColors(0x000000, palette.bricks.steel, 0.6),
      spark: 0xffa500,
    });
  });

  it.each([
    ["light", 0.72, 0.12],
    ["dark", 0.62, 0.3],
  ] as const)(
    "lightens a gift's ribbon from the accent and a regrowing brick's moss from the green tint, in a %s palette",
    (mode, ribbon, moss) => {
      const green = TILE_INKS[mode][3] ?? NaN;

      expect(bricksPalette(ROLES, mode).kindInks).toMatchObject({
        ribbon: mixColors(0xffffff, 0x00ff00, ribbon),
        moss: mixColors(0xffffff, green, moss),
        mossShadow: mixColors(0x000000, green, 0.38),
      });
    },
  );

  it.each([
    ["light", 0.12],
    ["dark", 0.3],
  ] as const)(
    "fades a hidden ghost's tint 35% toward the field, and pales a shown one's toward white, in a %s palette",
    (mode, light) => {
      const tint = TILE_INKS[mode][4] ?? NaN;

      const { ghostTints } = bricksPalette(
        { ...ROLES, panel: "#102030" },
        mode,
      );

      expect({
        hidden: ghostTints.hidden[4],
        shown: ghostTints.shown[4],
        tints: [ghostTints.hidden.length, ghostTints.shown.length],
      }).toEqual({
        hidden: mixColors(0x102030, tint, 0.35),
        shown: mixColors(0xffffff, tint, light),
        tints: [TINTS, TINTS],
      });
    },
  );

  it.each(["light", "dark"] as const)(
    "tints the bricks with the tiles' %s inks in a palette of that mode",
    (mode) => {
      expect(bricksPalette(ROLES, mode).tints).toBe(TILE_INKS[mode]);
    },
  );

  it.each(["light", "dark"] as const)(
    "gives each tint a level may name a color in a %s palette",
    (mode) => {
      expect(bricksPalette(ROLES, mode).tints).toHaveLength(TINTS);
    },
  );
});

describe("tintAt", () => {
  it("gives the color at a place in a list of tints", () => {
    expect(tintAt([1, 2, 3], 1)).toBe(2);
  });

  it("throws for a tint the list doesn't hold", () => {
    expect(() => tintAt([1, 2, 3], 3)).toThrow("No tint 3");
  });
});
