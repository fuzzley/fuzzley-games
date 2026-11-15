import { FUZZBALL_INKS } from "@fz/phaser/color";
import { DARK_ROCK_INKS, LIGHT_ROCK_INKS } from "../colors/inks";
import { type PaletteRoles, beltPalette } from "../colors/palette";
import {
  LIMITS,
  type PlaceColors,
  STAR_SHARES,
  type Tint,
  hardOther,
  hardTones,
  mix,
  placeColors,
  shareOf,
  smallTone,
  starColor,
  tintOf,
  toneUnder,
} from "./colors";

/** A dark palette's roles, each a color no other takes. */
const DARK_ROLES: PaletteRoles = {
  page: "#101418",
  field: "#1c2329",
  fieldLine: "#2a333b",
  fieldText: "#eceff1",
  fieldMuted: "#9aa5af",
  accent: "#e0b13a",
  onAccent: "#1a1300",
  danger: "#f47c74",
  warning: "#f39a4b",
};

/** A light palette's roles, each a color no other takes. */
const LIGHT_ROLES: PaletteRoles = {
  page: "#f4f1fb",
  field: "#ffffff",
  fieldLine: "#e2dcf0",
  fieldText: "#2b2240",
  fieldMuted: "#6a6080",
  accent: "#6d3fc8",
  onAccent: "#fffffe",
  danger: "#c0265a",
  warning: "#964a00",
};

/** What a dark palette's places are mixed from. */
const DARK = placeColors(beltPalette(DARK_ROLES, "dark"));

/** What a light palette's places are mixed from. */
const LIGHT = placeColors(beltPalette(LIGHT_ROLES, "light"));

describe("mix", () => {
  it("returns a color a share of the way from one to another", () => {
    expect([mix(0x000000, 0xffffff, 0), mix(0x000000, 0xffffff, 0.5)]).toEqual([
      0x000000, 0x808080,
    ]);
  });

  it("returns the other color the whole way", () => {
    expect(mix(0x102030, 0x405060, 1)).toBe(0x405060);
  });
});

describe("placeColors", () => {
  it("takes the palette's mode, its page and its field's colors, its text the shots' and its danger and warning the comet's and the flame's", () => {
    const { mode, page, field, text, muted, accent, danger, warning } = DARK;

    expect({ mode, page, field, text, muted, accent, danger, warning }).toEqual(
      {
        mode: "dark",
        page: 0x101418,
        field: 0x1c2329,
        text: 0xeceff1,
        muted: 0x9aa5af,
        accent: 0xe0b13a,
        danger: 0xf47c74,
        warning: 0xf39a4b,
      },
    );
  });

  it.each([
    ["dark", DARK, DARK_ROCK_INKS],
    ["light", LIGHT, LIGHT_ROCK_INKS],
  ] as const)(
    "takes the rocks' inks of a %s palette, the core among them, and the blue and violet pilots'",
    (mode, colors, inks) => {
      const { stone, ice, crystal, iron, volatile, lodestone } = inks.kinds;

      expect([colors.rocks, colors.core, colors.blue, colors.violet]).toEqual([
        { stone, ice, crystal, iron, volatile, lodestone },
        inks.core,
        FUZZBALL_INKS[mode][5],
        FUZZBALL_INKS[mode][6],
      ]);
    },
  );

  it("throws for a palette short of the blue and the violet pilots", () => {
    const palette = { ...beltPalette(DARK_ROLES, "dark"), pilots: [1, 2, 3] };

    expect(() => placeColors(palette)).toThrow(RangeError);
  });
});

describe("tintOf", () => {
  it.each<[Tint, (colors: PlaceColors) => number]>([
    ["accent", ({ accent }) => accent],
    ["danger", ({ danger }) => danger],
    ["warning", ({ warning }) => warning],
    ["text", ({ text }) => text],
    ["muted", ({ muted }) => muted],
    ["blue", ({ blue }) => blue],
    ["violet", ({ violet }) => violet],
    ["ice", ({ rocks }) => rocks.ice],
    ["lodestone", ({ rocks }) => rocks.lodestone],
  ])("gives %s as the palette has it", (tint, color) => {
    expect([tintOf(tint, DARK), tintOf(tint, LIGHT)]).toEqual([
      color(DARK),
      color(LIGHT),
    ]);
  });

  it("gives deep as the page in a dark palette and the field's muted text in a light one", () => {
    expect([tintOf("deep", DARK), tintOf("deep", LIGHT)]).toEqual([
      DARK.page,
      LIGHT.muted,
    ]);
  });

  it("gives a cloud the field sunk toward the page in a dark palette, and the paper itself in a light one", () => {
    expect([tintOf("cloud", DARK), tintOf("cloud", LIGHT)]).toEqual([
      mix(DARK.field, DARK.page, 0.9 * LIMITS.dark.deep),
      LIGHT.field,
    ]);
  });

  it("gives a spark a volatile rock's core, with some of its ink in a light palette, where the core alone is too pale", () => {
    expect([tintOf("spark", DARK), tintOf("spark", LIGHT)]).toEqual([
      DARK.core,
      mix(LIGHT.core, LIGHT.rocks.volatile, 0.35),
    ]);
  });
});

describe("shareOf", () => {
  it("holds each kind of mark to its limit, at a share of it", () => {
    expect([
      shareOf("ice", 0.5, "wash", DARK),
      shareOf("ice", 0.5, "landmark", LIGHT),
      shareOf("text", 1, "line", DARK),
      shareOf("stone", 1, "small", LIGHT),
    ]).toEqual([0.05, 0.05, 0.16, 0.18]);
  });

  it("holds a wash or a landmark's deep to the deep's own limit, which sinks a dark field far toward the page", () => {
    expect([
      shareOf("deep", 1, "wash", DARK),
      shareOf("deep", 1, "landmark", LIGHT),
    ]).toEqual([0.5, 0.05]);
  });

  it("holds a line in deep to the lines' limit", () => {
    expect(shareOf("deep", 1, "line", DARK)).toBe(0.16);
  });
});

describe("hardOther", () => {
  it("lights the ink toward white in a dark palette", () => {
    expect(hardOther("iron", DARK)).toBe(mix(DARK.rocks.iron, 0xffffff, 0.42));
  });

  it("sinks the ink toward the field's text in a light palette, as ink on paper", () => {
    expect(hardOther("iron", LIGHT)).toBe(
      mix(LIGHT.rocks.iron, LIGHT.text, 0.52),
    );
  });
});

describe("hardTones", () => {
  it("cuts a dark palette's landmark from the field sunk toward the page, up to a tenth of its lit ink", () => {
    const other = hardOther("stone", DARK);

    expect(hardTones("stone", DARK)).toEqual([
      mix(DARK.field, DARK.page, 0.9 * 0.5),
      mix(DARK.field, other, 0.16 * 0.1),
      mix(DARK.field, other, 0.56 * 0.1),
      mix(DARK.field, other, 1 * 0.1),
    ]);
  });

  it("cuts a light palette's from a tenth of its deep ink, in its shade, to the paper nearly bare, where the light falls", () => {
    const other = hardOther("stone", LIGHT);

    expect(hardTones("stone", LIGHT)).toEqual([
      mix(LIGHT.field, other, 1 * 0.1),
      mix(LIGHT.field, other, 0.7 * 0.1),
      mix(LIGHT.field, other, 0.42 * 0.1),
      mix(LIGHT.field, other, 0.14 * 0.1),
    ]);
  });
});

describe("toneUnder", () => {
  /** Four tones a spec reads a face's between. */
  const TONES = [0x000000, 0x404040, 0x808080, 0xc0c0c0] as const;

  it.each([
    ["unlit", 0.3, 0x000000],
    ["a third lit", 0.3 + 0.82 / 3, 0x404040],
    ["half lit", 0.3 + 0.82 / 2, 0x606060],
    ["two thirds lit", 0.3 + (0.82 * 2) / 3, 0x808080],
    ["wholly lit", 1.12, 0xc0c0c0],
    ["lit past its most", 1.4, 0xc0c0c0],
    ["darker than unlit", 0.1, 0x000000],
  ])("gives a face %s its tone", (_name, light, tone) => {
    expect(toneUnder(light, TONES)).toBe(tone);
  });
});

describe("smallTone", () => {
  it("mixes a little of the hard ink into the field, more where the light falls", () => {
    const other = hardOther("iron", DARK);

    expect([smallTone(0.75, "iron", DARK), smallTone(1, "iron", DARK)]).toEqual(
      [mix(DARK.field, other, 0.26 * 0.75), mix(DARK.field, other, 0.26)],
    );
  });

  it("holds the light it takes between 0.4 and 1.1", () => {
    expect([
      smallTone(0.1, "iron", LIGHT),
      smallTone(2, "iron", LIGHT),
    ]).toEqual([smallTone(0.4, "iron", LIGHT), smallTone(1.1, "iron", LIGHT)]);
  });
});

describe("starColor", () => {
  it("mixes the field's muted text, with a little of the place's tint, into the field by the depth", () => {
    const tinted = mix(LIGHT.muted, LIGHT.rocks.ice, 0.22);

    expect(starColor("mid", "ice", LIGHT)).toBe(
      mix(LIGHT.field, tinted, STAR_SHARES.light.mid),
    );
  });

  it("makes a bright star in a dark palette from the field's text", () => {
    const tinted = mix(DARK.text, DARK.rocks.ice, 0.22);

    expect(starColor("bright", "ice", DARK)).toBe(
      mix(DARK.field, tinted, STAR_SHARES.dark.bright),
    );
  });

  it("makes a bright star in a light palette dark, from the field's muted text", () => {
    const tinted = mix(LIGHT.muted, LIGHT.rocks.ice, 0.22);

    expect(starColor("bright", "ice", LIGHT)).toBe(
      mix(LIGHT.field, tinted, STAR_SHARES.light.bright),
    );
  });

  it("shows a nearer star more than a far one", () => {
    const [far, mid] = [
      starColor("far", "ice", DARK),
      starColor("mid", "ice", DARK),
    ];

    expect(mid & 0xff).toBeGreaterThan(far & 0xff);
  });
});
