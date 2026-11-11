import { BRICK_KIND_IDS, type BrickKindId } from "../../rules/catalog/bricks";
import { ART_FRAMES, looksOf } from "../../testing/art_frames";
import { BRICK_ART, type BrickLook, brickLayers } from "./art";
import { INKS } from "./frames";

/**
 * Returns a whole brick of a kind, of the fewest hits a level gives it, or
 * none for a kind that never breaks, plated as the legend's first character
 * for it plates it: the first whole one of its looks.
 *
 * @throws {Error} for a kind with no whole look, which no level could hold.
 */
function wholeOf(kind: BrickKindId): BrickLook {
  const whole = looksOf(kind).find(({ hits, full }) => hits === full);
  if (whole === undefined) throw new Error(`No whole ${kind}`);
  return whole;
}

describe("BRICK_ART", () => {
  it("draws every kind of brick the catalog has", () => {
    expect(Object.keys(BRICK_ART)).toEqual(BRICK_KIND_IDS);
  });
});

describe("brickLayers", () => {
  const names = new Set(ART_FRAMES.map((frame) => frame.name));

  it.each(BRICK_KIND_IDS)(
    "shows every look a %s can take in frames the atlas holds",
    (kind) => {
      const missing = looksOf(kind).flatMap((look) =>
        brickLayers(look).filter((name) => !names.has(name)),
      );

      expect(missing).toEqual([]);
    },
  );

  it.each(BRICK_KIND_IDS)(
    "makes nothing to find a %s's layers, handing back the list it made once",
    (kind) => {
      const [look] = looksOf(kind);

      expect(look && brickLayers(look)).toBe(look && brickLayers({ ...look }));
    },
  );

  it("shows a tough brick of tint 4 with 3 hits left of 5 as its tile, its pips and its cracks", () => {
    expect(
      brickLayers({ kind: "tough", tint: 4, hits: 3, full: 5, plates: 0 }),
    ).toEqual(["tile-4", "pips-3", "cracks-2"]);
  });

  it.each(INKS)(
    "shows a cage of tint %i over its friend in that ink, whole and then hit",
    (tint) => {
      const whole: BrickLook = {
        kind: "cage",
        tint,
        hits: 2,
        full: 2,
        plates: 0,
      };

      expect([brickLayers(whole), brickLayers({ ...whole, hits: 1 })]).toEqual([
        [`caged-${String(tint)}`, "cage-whole"],
        [`caged-${String(tint)}`, "cage-hit"],
      ]);
    },
  );

  it.each(BRICK_KIND_IDS)(
    "shows a whole %s unlike a whole brick of any other kind",
    (kind) => {
      const shown = brickLayers(wholeOf(kind)).join(" ");

      expect(
        BRICK_KIND_IDS.filter(
          (other) =>
            other !== kind && brickLayers(wholeOf(other)).join(" ") === shown,
        ),
      ).toEqual([]);
    },
  );

  it.each([
    { kind: "brick", tint: 8, hits: 1, full: 1, plates: 0 },
    { kind: "tough", tint: 0, hits: 7, full: 7, plates: 0 },
  ] as const)(
    "refuses a look no frame shows: $kind of tint $tint with $hits hits",
    (brick) => {
      expect(() => brickLayers(brick)).toThrow(RangeError);
    },
  );
});
