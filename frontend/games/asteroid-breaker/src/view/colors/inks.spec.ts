import { colorNumber } from "@fz/phaser/color";
import { PILOT_COLORS } from "../../rules/ship/pilots";
import {
  DARK_PILOT_INKS,
  DARK_ROCK_INKS,
  LIGHT_PILOT_INKS,
  LIGHT_ROCK_INKS,
} from "./inks";

/** How far apart in CIELAB, by CIE76, any two pilots' inks keep, so two side by side never look alike. */
const PILOTS_APART = 27;

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
    ["light", LIGHT_ROCK_INKS],
    ["dark", DARK_ROCK_INKS],
  ])("give each kind of rock a %s ink of its own", (_, inks) => {
    const bodies = Object.values(inks.kinds);

    expect(new Set(bodies).size).toBe(bodies.length);
  });

  it.each([
    ["light", LIGHT_PILOT_INKS],
    ["dark", DARK_PILOT_INKS],
  ])("give each pilot's color a %s ink", (_, inks) => {
    expect(inks).toHaveLength(PILOT_COLORS);
  });

  it.each([
    ["light", LIGHT_PILOT_INKS],
    ["dark", DARK_PILOT_INKS],
  ])(
    `keep the %s pilots' inks ${String(PILOTS_APART)} or more apart`,
    (_, inks) => {
      expect(nearest(inks.map(colorNumber))).toBeGreaterThanOrEqual(
        PILOTS_APART,
      );
    },
  );
});
