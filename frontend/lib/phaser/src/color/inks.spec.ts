import { FUZZBALL } from "@fz/style/fuzzball";
import { contrast, rgb, rgbOf } from "@fz/style/testing";
import { FUZZBALL_INKS, TILE_INKS } from "./inks";

/** How far apart in CIELAB, by CIE76, any two fuzzballs' inks keep, so two side by side never look alike. */
const FUZZBALLS_APART = 27;

/** The least contrast WCAG asks of a graphic, as the fuzzball's eyes are against its body. */
const GRAPHIC = 3;

/** Returns a color Phaser takes in CIELAB, under D65. */
function labOf(color: number): readonly [number, number, number] {
  const linear = (shift: number): number => {
    const channel = ((color >> shift) & 0xff) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  };
  const red = linear(16);
  const green = linear(8);
  const blue = linear(0);
  const x = (0.4124 * red + 0.3576 * green + 0.1805 * blue) / 0.95047;
  const y = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  const z = (0.0193 * red + 0.1192 * green + 0.9505 * blue) / 1.08883;
  const f = (t: number): number =>
    t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** Returns how far apart two colors lie in CIELAB, by CIE76. */
function deltaE(one: number, other: number): number {
  const [l1, a1, b1] = labOf(one);
  const [l2, a2, b2] = labOf(other);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/** Returns the nearest any two of some colors lie, by CIE76. */
function nearest(colors: readonly number[]): number {
  return Math.min(
    ...colors.flatMap((one, i) =>
      colors.slice(i + 1).map((other) => deltaE(one, other)),
    ),
  );
}

describe("the inks", () => {
  it.each([
    ["tiles", "light", TILE_INKS.light],
    ["tiles", "dark", TILE_INKS.dark],
    ["fuzzballs", "light", FUZZBALL_INKS.light],
    ["fuzzballs", "dark", FUZZBALL_INKS.dark],
  ])("give %s eight %s inks, each its own", (_, _mode, inks) => {
    expect({ count: inks.length, distinct: new Set(inks).size }).toEqual({
      count: 8,
      distinct: 8,
    });
  });

  it.each([
    ["light", FUZZBALL_INKS.light],
    ["dark", FUZZBALL_INKS.dark],
  ])(
    `keep the %s fuzzballs' inks ${String(FUZZBALLS_APART)} or more apart`,
    (_, inks) => {
      expect(nearest(inks)).toBeGreaterThanOrEqual(FUZZBALLS_APART);
    },
  );

  it.each(
    (["light", "dark"] as const).flatMap((mode) =>
      FUZZBALL_INKS[mode].map((ink, i) => [mode, i + 1, ink] as const),
    ),
  )(
    `keep the fuzzball's eyes ${String(GRAPHIC)}:1 or more against the %s fuzzball ink %i`,
    (_mode, _place, ink) => {
      expect(contrast(rgb(FUZZBALL.ink), rgbOf(ink))).toBeGreaterThanOrEqual(
        GRAPHIC,
      );
    },
  );
});
