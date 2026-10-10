import { describe, it, expect } from "vitest";
import {
  hasCardDeckVectors,
  loadCardDeckVectors,
} from "@/engine/render/phaser/deck/card_deck_vectors";
import { CARD_BACKS } from "@/engine/render/deck/card_back";

describe("card deck vectors", () => {
  it("draws the mobile deck at any size", () => {
    expect(hasCardDeckVectors("mobile")).toBe(true);
  });

  it("leaves the desktop decks to their built atlases", () => {
    expect(hasCardDeckVectors("classic")).toBe(false);
  });

  it("has an SVG for every face of the mobile deck", async () => {
    const vectors = await loadCardDeckVectors("mobile");

    const faces = Object.keys(vectors ?? {}).filter(
      (name) => !name.startsWith("card-back"),
    );
    expect(faces).toHaveLength(52);
  });

  it("has an SVG for the mobile deck's own backs, not the artwork's", async () => {
    // The artwork's backs live only in the desktop sheets, so the board copies
    // them from the built atlas.
    const vectors = await loadCardDeckVectors("mobile");

    const backs = CARD_BACKS.map((back) => back.style).filter(
      (style) => vectors?.[style] !== undefined,
    );
    expect(backs).toEqual(["card-back-blue", "card-back-red"]);
  });

  it("sets no text, which an SVG drawn as an image could not load a font for", async () => {
    const vectors = await loadCardDeckVectors("mobile");

    const withText = Object.entries(vectors ?? {})
      .filter(([, svg]) => svg.includes("<text"))
      .map(([name]) => name);
    expect(withText).toEqual([]);
  });

  it("loads nothing for a deck without vectors", async () => {
    expect(await loadCardDeckVectors("classic")).toBeNull();
  });
});
