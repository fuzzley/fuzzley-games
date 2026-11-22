import { FUZZBALL_INKS, TILE_INKS, mixColors } from "@fz/phaser/color";
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

  it("draws the serve's guide in the text", () => {
    expect(bricksPalette(ROLES, "light").guide).toBe(0x000000);
  });

  it("keeps the text, for a place's pattern to be washed from", () => {
    expect(bricksPalette(ROLES, "light").text).toBe(0x000000);
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
    "trails a slider's lit chevron with its tint at 45% over the marks' color, in a %s palette",
    (mode) => {
      const { sliderTrails } = bricksPalette(
        { ...ROLES, panel: "#102030" },
        mode,
      );

      expect({
        trail: sliderTrails[4],
        tints: sliderTrails.length,
      }).toEqual({
        trail: mixColors(TILE_INKS[mode][4] ?? NaN, 0x102030, 0.45),
        tints: TINTS,
      });
    },
  );

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

  it("draws a cage and a gate in the steel and a key in the warning color, and plates a plated brick in the steel, its shine at 40% white", () => {
    const palette = bricksPalette(ROLES, "light");
    const { steel } = palette.bricks;

    expect({
      cage: palette.bricks.cage,
      gate: palette.bricks.gate,
      key: palette.bricks.key,
      plate: palette.kindInks.plate,
      plateShine: palette.kindInks.plateShine,
    }).toEqual({
      cage: steel,
      gate: steel,
      key: 0xffa500,
      plate: steel,
      plateShine: mixColors(0xffffff, steel, 0.4),
    });
  });

  it("draws a bumper in the accent", () => {
    expect(bricksPalette(ROLES, "light").bricks.bumper).toBe(0x00ff00);
  });

  it.each(["light", "dark"] as const)(
    "rings the first pair of portals in the violet tint and the second in the teal, their arms and badges a third of the way to the text, in a %s palette",
    (mode) => {
      const [violet = NaN, teal = NaN] = [6, 4].map(
        (tint) => TILE_INKS[mode][tint],
      );

      expect(
        bricksPalette({ ...ROLES, text: "#102030" }, mode).portals,
      ).toEqual([
        { ring: violet, glyph: mixColors(0x102030, violet, 0.34) },
        { ring: teal, glyph: mixColors(0x102030, teal, 0.34) },
      ]);
    },
  );

  it.each(["light", "dark"] as const)(
    "dresses the friends in the fuzzballs' inks of a %s palette",
    (mode) => {
      expect(bricksPalette(ROLES, mode).friendInks).toEqual(
        FUZZBALL_INKS[mode],
      );
    },
  );

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

  it.each(["light", "dark"] as const)(
    "rings a regrowing brick growing back in the green tint, over a track of it at 30% over the field, in a %s palette",
    (mode) => {
      const green = TILE_INKS[mode][3] ?? NaN;

      expect(
        bricksPalette({ ...ROLES, panel: "#102030" }, mode).kindInks,
      ).toMatchObject({
        regrowRing: green,
        regrowTrack: mixColors(green, 0x102030, 0.3),
      });
    },
  );

  it("shades the rim's lip 30% black, and washes the gutter and its chevrons with the danger color, 10% and 55% over the field", () => {
    const palette = bricksPalette({ ...ROLES, panel: "#102030" }, "light");

    expect(palette.fieldInks).toEqual({
      rimLip: mixColors(0x000000, palette.wall, 0.3),
      gutter: mixColors(0xff0000, 0x102030, 0.1),
      chevron: mixColors(0xff0000, 0x102030, 0.55),
    });
  });

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
