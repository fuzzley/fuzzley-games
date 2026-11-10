import {
  BRICK_KIND_IDS,
  type BrickKindId,
  brickKind,
} from "../../rules/catalog/bricks";
import { ART_FRAMES, ART_PALETTE } from "../../testing/art_frames";
import { BRICK_ART, type BrickLook, brickColor, brickLayers } from "./art";
import { INKS } from "./kinds/brick";

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

  it.each([
    { kind: "brick", tint: 4, hits: 1, full: 1, layers: ["tile-4"] },
    {
      kind: "tough",
      tint: 4,
      hits: 3,
      full: 5,
      layers: ["tile-4", "pips-3", "cracks-2"],
    },
    { kind: "steel", tint: 0, hits: 0, full: 0, layers: ["steel"] },
    { kind: "rowZapper", tint: 0, hits: 1, full: 1, layers: ["zapper-row"] },
    {
      kind: "columnZapper",
      tint: 0,
      hits: 1,
      full: 1,
      layers: ["zapper-column"],
    },
  ] as const)(
    "shows a $kind in the frames its kind's art gives it",
    ({ layers, ...look }) => {
      expect(brickLayers({ ...look, plates: 0 })).toEqual(layers);
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
  it.each([
    { kind: "brick", tint: 3, color: ART_PALETTE.tints[3] },
    { kind: "tough", tint: 7, color: ART_PALETTE.tints[7] },
    { kind: "steel", tint: 0, color: ART_PALETTE.kinds.steel.body },
    { kind: "rowZapper", tint: 0, color: ART_PALETTE.kinds.rowZapper.body },
    {
      kind: "columnZapper",
      tint: 0,
      color: ART_PALETTE.kinds.columnZapper.body,
    },
  ] as const)("colors a $kind of tint $tint's shards", ({ color, ...look }) => {
    expect(
      brickColor({ ...look, hits: 1, full: 1, plates: 0 }, ART_PALETTE),
    ).toBe(color);
  });
});
