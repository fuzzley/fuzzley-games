import { isKeyOf, isOneOf } from "@fz/core/records";
import {
  BRICK_KIND_IDS,
  type BrickKindId,
  brickKind,
} from "../../rules/catalog/bricks";
import { ART_FRAMES, ART_PALETTE } from "../../testing/art_frames";
import { inkAt } from "../colors/inks";
import { BRICK_ART, type BrickLook, brickColor, brickLayers } from "./art";
import { INKS } from "./frames";

/**
 * Returns every look a brick of a kind can take: each tint, each count of
 * hits it can start with, and each it can come down to, or none, for a kind
 * that never breaks.
 */
function looksOf(kind: BrickKindId): readonly BrickLook[] {
  const { hits, mostHits } = brickKind(kind);
  if (hits === "never") {
    return INKS.map((tint) => ({ kind, tint, hits: 0, full: 0, plates: 0 }));
  }
  const fewest = hits;
  const fulls = Array.from(
    { length: Math.max(mostHits, fewest) - fewest + 1 },
    (_, i) => fewest + i,
  );
  return INKS.flatMap((tint) =>
    fulls.flatMap((full) =>
      Array.from({ length: full }, (_, i) => ({
        kind,
        tint,
        hits: i + 1,
        full,
        plates: 0,
      })),
    ),
  );
}

/** Returns a whole brick of a kind in a tint, of the fewest hits a level gives it, or none for a kind that never breaks. */
function wholeOf(kind: BrickKindId, tint = 0): BrickLook {
  const { hits } = brickKind(kind);
  const full = hits === "never" ? 0 : hits;
  return { kind, tint, hits: full, full, plates: 0 };
}

/** The kinds drawn in their row's tint, whose shards take its ink. */
const TINTED = ["brick", "tough"] as const satisfies readonly BrickKindId[];

/** The cataloged kinds the palette keeps inks of their own for, whose shards take its body. */
const INKED = BRICK_KIND_IDS.filter((kind) => isKeyOf(kind, ART_PALETTE.kinds));

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

describe("brickColor", () => {
  it.each(INKED)(
    "colors a %s's shards in the body of the inks the palette keeps for its kind, whatever its tint",
    (kind) => {
      const { body } = ART_PALETTE.kinds[kind];

      expect(
        INKS.map((tint) => brickColor(wholeOf(kind, tint), ART_PALETTE)),
      ).toEqual(INKS.map(() => body));
    },
  );

  it.each(TINTED)("colors a %s's shards in its tint's ink", (kind) => {
    expect(
      INKS.map((tint) => brickColor(wholeOf(kind, tint), ART_PALETTE)),
    ).toEqual(INKS.map((tint) => inkAt(ART_PALETTE.tints, tint)));
  });

  it("knows how every cataloged kind's shards are colored, by its own inks or by its tint", () => {
    expect(
      BRICK_KIND_IDS.filter(
        (kind) => !isOneOf(kind, INKED) && !isOneOf(kind, TINTED),
      ),
    ).toEqual([]);
  });
});
