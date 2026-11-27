import { isDeepStrictEqual } from "node:util";
import { BRICK_LAYERS, DUST_LAYERS } from "../catalog/elements";
import { KIND_IDS } from "../catalog/kinds";
import { DUST_LEGEND, LEGEND, type Placed } from "./legend";

/** Returns every letter the legend draws a square's placing in. */
function lettersFor(placed: Placed): string[] {
  return Object.entries(LEGEND)
    .filter(([, each]) => isDeepStrictEqual(each, placed))
    .map(([letter]) => letter);
}

describe("LEGEND", () => {
  it.each(KIND_IDS)("draws a %s fuzzball in a letter of its own", (kind) => {
    expect(
      lettersFor({ what: "fuzzball", kind, caged: false, burred: false }),
    ).toHaveLength(1);
  });

  it.each(KIND_IDS)(
    "draws a caged %s fuzzball in its plain letter's capital",
    (kind) => {
      const plain = lettersFor({
        what: "fuzzball",
        kind,
        caged: false,
        burred: false,
      });

      const caged = lettersFor({
        what: "fuzzball",
        kind,
        caged: true,
        burred: false,
      });

      expect(caged).toEqual(plain.map((letter) => letter.toUpperCase()));
    },
  );

  it.each([
    [false, false],
    [true, false],
    [false, true],
  ])(
    "draws a fuzzball of any kind, caged %s and burred %s, in a letter of its own",
    (caged, burred) => {
      expect(
        lettersFor({ what: "fuzzball", kind: null, caged, burred }),
      ).toHaveLength(1);
    },
  );

  it.each(BRICK_LAYERS)("draws a brick of %i layers in its digit", (layers) => {
    expect(LEGEND[`${layers}`]).toEqual({ what: "brick", layers });
  });
});

describe("DUST_LEGEND", () => {
  it.each(DUST_LAYERS)("draws %i layers of dust in its digit", (layers) => {
    expect(DUST_LEGEND[`${layers}`]).toBe(layers);
  });
});
