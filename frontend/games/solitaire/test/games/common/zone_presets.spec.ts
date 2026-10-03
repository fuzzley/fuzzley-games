import { describe, it, expect } from "vitest";
import {
  CLOSED_STOCK_PLACEHOLDER,
  PIP_COUNTS,
  RECYCLING_STOCK_PLACEHOLDER,
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

    expect([manifests.length, missing]).toEqual([6, []]);
  });
});
