import { describe, it, expect } from "vitest";
import { CARD_DECKS } from "@/engine/render/card_deck";
import { CARD_ART_SCALES } from "@/engine/render/layout/card_metrics";
import {
  CLOSED_STOCK_PLACEHOLDER,
  PIP_COUNTS,
  RECYCLING_STOCK_PLACEHOLDER,
  recycleMarker,
  recyclePipsPlaceholder,
} from "@/games/common/zone_presets";

/** Returns every pip placeholder, for every count the artwork covers. */
function everyPipPlaceholder(): string[] {
  return PIP_COUNTS.flatMap((allowed) =>
    Array.from({ length: allowed }, (_, index) =>
      recyclePipsPlaceholder(index + 1, allowed),
    ),
  );
}

describe("recyclePipsPlaceholder", () => {
  it("fills a pip for each use left", () => {
    expect(recyclePipsPlaceholder(1, 2)).toBe(
      "card-placeholder-full-border-reset-1-of-2",
    );
  });

  it("shows every pip filled while none is spent", () => {
    expect(recyclePipsPlaceholder(2, 2)).toBe(
      "card-placeholder-full-border-reset-2-of-2",
    );
  });

  it("falls back to the plain arrow for a count no artwork covers", () => {
    expect(recyclePipsPlaceholder(4, 5)).toBe(RECYCLING_STOCK_PLACEHOLDER);
  });

  it("falls back to the plain arrow once nothing is left", () => {
    expect(recyclePipsPlaceholder(0, 2)).toBe(RECYCLING_STOCK_PLACEHOLDER);
  });

  it("names only artwork every deck's atlas holds", () => {
    const manifests = Object.values(
      import.meta.glob<{
        textures: { frames: { filename: string }[] }[];
      }>("/src/engine/render/assets/sprites/atlas/*/*/card_assets_atlas.json", {
        eager: true,
        import: "default",
      }),
    );
    const artwork = [
      ...everyPipPlaceholder(),
      RECYCLING_STOCK_PLACEHOLDER,
      CLOSED_STOCK_PLACEHOLDER,
    ];

    const missing = manifests.flatMap((manifest) => {
      const frames = new Set(
        manifest.textures.flatMap((texture) =>
          texture.frames.map((frame) => frame.filename),
        ),
      );
      return artwork.filter((key) => !frames.has(key));
    });

    // The count shows the glob found every deck at every density.
    expect([manifests.length, missing]).toEqual([
      CARD_DECKS.length * CARD_ART_SCALES.length,
      [],
    ]);
  });
});

describe("recycleMarker", () => {
  it("shows the closed outline, and does nothing, once it is not usable", () => {
    expect(recycleMarker({ usable: false, remaining: 1, allowed: 2 })).toEqual({
      artwork: CLOSED_STOCK_PLACEHOLDER,
      actionable: false,
    });
  });

  it("shows a pip for each use left when the uses are counted", () => {
    expect(recycleMarker({ usable: true, remaining: 1, allowed: 2 })).toEqual({
      artwork: recyclePipsPlaceholder(1, 2),
      actionable: true,
    });
  });

  it("shows the recycle arrow when the uses are not counted", () => {
    expect(
      recycleMarker({ usable: true, remaining: Infinity, allowed: Infinity }),
    ).toEqual({ artwork: RECYCLING_STOCK_PLACEHOLDER, actionable: true });
  });
});
