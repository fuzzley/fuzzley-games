import { itemAt } from "@fz/core/records";
import { contrast, luminance, rgbOf } from "@fz/style/testing";
import type { ColorMode } from "@fz/style/themes";
import { BRICK_LAYERS } from "../../rules/catalog/elements";
import { KIND_IDS, type KindId } from "../../rules/catalog/kinds";
import { pieceInks } from "./inks";

/** Returns a color's luminance, as WCAG defines it. */
function lightness(color: number): number {
  return luminance(rgbOf(color));
}

/** Returns each step up a brick's pile, in a mode: the lightness of the cushion above and the one below, and the contrast between them. */
function cushionSteps(
  mode: ColorMode,
): readonly { above: number; below: number; ratio: number }[] {
  const { cushions } = pieceInks(mode);
  const shades = BRICK_LAYERS.map((place) => cushions[place]);
  return shades.slice(1).map((shade, place) => {
    const beneath = itemAt(shades, place);
    return {
      above: lightness(shade),
      below: lightness(beneath),
      ratio: contrast(rgbOf(shade), rgbOf(beneath)),
    };
  });
}

describe("pieceInks", () => {
  it.each([
    ["blue", 0x2c72d6, 0x72adff],
    ["red", 0xd33f37, 0xff7b70],
    ["amber", 0x957000, 0xf2cb45],
    ["green", 0x2c8a3a, 0x72d36a],
    ["violet", 0x8b55dc, 0xb892ff],
    ["pink", 0xc83a8e, 0xff7dc3],
  ] satisfies readonly (readonly [KindId, number, number])[])(
    "inks the %s kind in its fuzzball ink of each mode",
    (kind, light, dark) => {
      const inks = [pieceInks("light"), pieceInks("dark")];

      expect(inks.map(({ kinds }) => kinds[kind])).toEqual([light, dark]);
    },
  );

  it("mixes a special's second fur from its kind's ink as the design's art does, 0.38 of the way to black in a light palette and half way to white in a dark one", () => {
    const furs = [pieceInks("light"), pieceInks("dark")];

    expect(furs.map(({ secondFurs }) => secondFurs.blue)).toEqual([
      0x1b4785, 0xb9d6ff,
    ]);
  });

  it.each(KIND_IDS)(
    "draws the %s kind's second fur darker than it in a light palette and lighter in a dark one",
    (kind) => {
      const [light, dark] = [pieceInks("light"), pieceInks("dark")];

      expect({
        light: lightness(light.secondFurs[kind]) < lightness(light.kinds[kind]),
        dark: lightness(dark.secondFurs[kind]) > lightness(dark.kinds[kind]),
      }).toEqual({ light: true, dark: true });
    },
  );

  it.each(["light", "dark"] as const)(
    "darkens each of a brick's cushions from the one beneath in a %s palette",
    (mode) => {
      const steps = cushionSteps(mode);

      expect(steps.map(({ above, below }) => above < below)).toEqual([
        true,
        true,
        true,
      ]);
    },
  );

  it.each(["light", "dark"] as const)(
    "steps a brick's cushions evenly in lightness in a %s palette",
    (mode) => {
      const ratios = cushionSteps(mode).map(({ ratio }) => ratio);

      expect(Math.max(...ratios) - Math.min(...ratios)).toBeLessThan(0.05);
    },
  );

  it.each([
    ["light", [0x735a3d, 0x634935, 0x523a2e, 0x412a27]],
    ["dark", [0xb5a68a, 0xa38f7c, 0x917b71, 0x7e6a67]],
  ] as const)(
    "shades each cushion's underside a fifth of the way from its ink to black, in a %s palette",
    (mode, undersides) => {
      const { cushionUndersides } = pieceInks(mode);

      expect(BRICK_LAYERS.map((place) => cushionUndersides[place])).toEqual(
        undersides,
      );
    },
  );

  it("draws a cage's bars in the eyes' ink in every palette", () => {
    const palettes = [pieceInks("light"), pieceInks("dark")];

    expect(palettes.map(({ cage }) => cage.bars)).toEqual([0x14171b, 0x14171b]);
  });

  it("edges a burr's thorns in a darker ink in every palette, as the design draws them", () => {
    const palettes = [pieceInks("light"), pieceInks("dark")];

    expect(
      palettes.map(
        ({ burr, burrEdge }) => lightness(burrEdge) < lightness(burr),
      ),
    ).toEqual([true, true]);
  });
});
