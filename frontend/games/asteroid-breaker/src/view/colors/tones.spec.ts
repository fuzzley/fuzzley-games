import { mixTone, tonesOf } from "./tones";

// The tones the art kit's `tonesOf()`
// (`docs/archive/asteroid-breaker-uplift/art/lib/palettes.mjs`) mixes for a
// stone's ink and a volatile rock's, in each palette, copied from the kit.
const KIT_TONES = [
  {
    name: "a stone's ink in classic",
    palette: "classic",
    mode: "light",
    field: 0xffffff,
    text: 0x1b1f24,
    ink: 0x8b7f70,
    tones: { lit: 0xaea59b, ink: 0x8b7f70, shade: 0x696259, deep: 0x514d48 },
  },
  {
    name: "a volatile rock's ink in classic",
    palette: "classic",
    mode: "light",
    field: 0xffffff,
    text: 0x1b1f24,
    ink: 0xc4452c,
    tones: { lit: 0xd67d6b, ink: 0xc4452c, shade: 0x913a2a, deep: 0x6c3128 },
  },
  {
    name: "a stone's ink in pastel",
    palette: "pastel",
    mode: "light",
    field: 0xffffff,
    text: 0x2b2240,
    ink: 0x8b7f70,
    tones: { lit: 0xaea59b, ink: 0x8b7f70, shade: 0x6e6362, deep: 0x594f57 },
  },
  {
    name: "a volatile rock's ink in pastel",
    palette: "pastel",
    mode: "light",
    field: 0xffffff,
    text: 0x2b2240,
    ink: 0xc4452c,
    tones: { lit: 0xd67d6b, ink: 0xc4452c, shade: 0x963b32, deep: 0x743336 },
  },
  {
    name: "a stone's ink in casino",
    palette: "casino",
    mode: "dark",
    field: 0x1c2329,
    text: 0xeceff1,
    ink: 0xa99d8e,
    tones: { lit: 0xcdc6bd, ink: 0xa99d8e, shade: 0x6b6762, deep: 0x4c4c4b },
  },
  {
    name: "a volatile rock's ink in casino",
    palette: "casino",
    mode: "dark",
    field: 0x1c2329,
    text: 0xeceff1,
    ink: 0xf0886a,
    tones: { lit: 0xf6baa9, ink: 0xf0886a, shade: 0x935c4d, deep: 0x64453f },
  },
  {
    name: "a stone's ink in midnight",
    palette: "midnight",
    mode: "dark",
    field: 0x172741,
    text: 0xe6edf7,
    ink: 0xa99d8e,
    tones: { lit: 0xcdc6bd, ink: 0xa99d8e, shade: 0x69696c, deep: 0x494f5b },
  },
  {
    name: "a volatile rock's ink in midnight",
    palette: "midnight",
    mode: "dark",
    field: 0x172741,
    text: 0xe6edf7,
    ink: 0xf0886a,
    tones: { lit: 0xf6baa9, ink: 0xf0886a, shade: 0x915d58, deep: 0x61484f },
  },
] as const;

describe("tonesOf()", () => {
  it.each(KIT_TONES)(
    "mixes the tones of $name as the kit does",
    ({ mode, field, text, ink, tones }) => {
      expect(tonesOf(ink, { mode, field, text })).toEqual(tones);
    },
  );
});

describe("mixTone()", () => {
  it("gives the first color at no share and the second at a whole one", () => {
    expect([
      mixTone(0x102030, 0xf0e0d0, 0),
      mixTone(0x102030, 0xf0e0d0, 1),
    ]).toEqual([0x102030, 0xf0e0d0]);
  });

  it("rounds each channel of a mix between", () => {
    expect(mixTone(0x000000, 0x030303, 0.5)).toBe(0x020202);
  });

  it("keeps each channel within a byte past either end", () => {
    expect([
      mixTone(0x808080, 0xffffff, 2),
      mixTone(0x808080, 0x000000, 2),
    ]).toEqual([0xffffff, 0x000000]);
  });
});
