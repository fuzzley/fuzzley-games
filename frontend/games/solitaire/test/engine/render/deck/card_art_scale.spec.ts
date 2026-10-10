import { describe, it, expect } from "vitest";
import { cardArtScaleFor } from "@/engine/render/deck/card_art_scale";

describe("cardArtScaleFor", () => {
  it("draws a phone's cards from the 1x atlas", () => {
    expect(cardArtScaleFor(0.48)).toBe(1);
  });

  it("keeps the 1x atlas while its cards are drawn texel for texel", () => {
    expect(cardArtScaleFor(1)).toBe(1);
  });

  it("moves to the 2x atlas once the 1x one would be enlarged", () => {
    expect(cardArtScaleFor(1.01)).toBe(2);
  });
});
