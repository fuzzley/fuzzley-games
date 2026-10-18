import { describe, it, expect } from "vitest";
import {
  CARD_ART_SCALES,
  cardArtScaleFor,
  cardFrameTexels,
  cardSpriteScale,
} from "@/engine/render/deck/card_art_scale";
import {
  CARD_RENDER_HEIGHT_PX,
  CARD_RENDER_WIDTH_PX,
} from "@/engine/render/layout/card_metrics";

describe("cardArtScaleFor", () => {
  it("draws a ten-column board on a phone from the 0.5x atlas", () => {
    expect(cardArtScaleFor(0.34)).toBe(0.5);
  });

  it("draws a seven-column board on a 2x phone from the 0.5x atlas", () => {
    expect(cardArtScaleFor(0.49)).toBe(0.5);
  });

  it("draws a seven-column board on a 3x phone from the 0.75x atlas", () => {
    expect(cardArtScaleFor(0.73)).toBe(0.75);
  });

  it("keeps an atlas while its cards are drawn texel for texel", () => {
    expect(cardArtScaleFor(1)).toBe(1);
  });

  it("moves to the next atlas once the one before would be enlarged", () => {
    expect(cardArtScaleFor(1.01)).toBe(1.5);
  });

  it("draws from the 2x atlas however large the cards", () => {
    expect(cardArtScaleFor(3)).toBe(2);
  });

  it("builds each density at most half as dense again as the one before", () => {
    // So no card is shrunk below two thirds of its atlas's size, where sampling
    // without mipmaps would start to skip texels.
    const steps = CARD_ART_SCALES.slice(1).map(
      (artScale, index) => artScale / CARD_ART_SCALES[index],
    );

    expect(Math.max(...steps)).toBeLessThanOrEqual(1.5);
  });
});

describe("cardFrameTexels", () => {
  it("sizes a whole density's frame exactly", () => {
    expect(cardFrameTexels(2)).toEqual({
      width: 2 * CARD_RENDER_WIDTH_PX,
      height: 2 * CARD_RENDER_HEIGHT_PX,
    });
  });

  it("rounds a fractional density's frame to whole texels", () => {
    // 307 units at 0.5x would be 153.5 texels.
    expect(cardFrameTexels(0.5)).toEqual({ width: 110, height: 154 });
  });
});

describe("cardSpriteScale", () => {
  it("divides the layout scale by a whole density on both axes", () => {
    expect(cardSpriteScale(0.5, 2)).toEqual({ x: 0.25, y: 0.25 });
  });

  it("draws a frame drawn for its very layout scale texel for texel", () => {
    expect(cardSpriteScale(0.73, 0.73)).toEqual({ x: 1, y: 1 });
  });

  it("draws a rounded frame at exactly the card's design size", () => {
    const layoutScale = 0.49;
    const texels = cardFrameTexels(0.5);

    const scale = cardSpriteScale(layoutScale, 0.5);

    expect([texels.width * scale.x, texels.height * scale.y]).toEqual([
      expect.closeTo(CARD_RENDER_WIDTH_PX * layoutScale, 9),
      expect.closeTo(CARD_RENDER_HEIGHT_PX * layoutScale, 9),
    ]);
  });
});
