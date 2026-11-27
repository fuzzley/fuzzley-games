import { colorNumber } from "@fz/phaser/color";
import { ART_ROLES, billionths } from "./art_frames";

describe("ART_ROLES", () => {
  it("gives every role a color no other takes", () => {
    const colors = Object.values(ART_ROLES).map(colorNumber);

    expect(new Set(colors).size).toBe(colors.length);
  });
});

describe("billionths", () => {
  it.each([
    [1.9999999999999991, 2],
    [1.2345678904, 1.23456789],
    [-0, 0],
  ])("rounds %f to a billionth, %f", (n, rounded) => {
    expect(billionths(n)).toBe(rounded);
  });
});
