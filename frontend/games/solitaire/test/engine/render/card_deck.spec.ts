import { describe, it, expect } from "vitest";
import {
  CARD_DECKS,
  DEFAULT_CARD_DECK,
  isCardDeckId,
} from "@/engine/render/card_deck";

describe("card decks", () => {
  it("names every deck once", () => {
    const ids = CARD_DECKS.map((deck) => deck.id);

    expect(ids).toEqual([...new Set(ids)]);
  });

  it("offers the deck a new player is given", () => {
    // Otherwise the drawer would check no deck and the loader would ask for an
    // atlas that is not built.
    expect(isCardDeckId(DEFAULT_CARD_DECK)).toBe(true);
  });

  it("gives every deck something to show and something to read", () => {
    const described = CARD_DECKS.filter(
      (deck) => deck.name.length > 0 && deck.description.length > 0,
    );

    expect(described).toEqual(CARD_DECKS);
  });

  it("gives every deck a pip coverage no other deck claims", () => {
    // The drawer previews coverage, so two decks sharing one would look alike.
    const coverages = CARD_DECKS.map((deck) => deck.pipCoverage);

    expect(new Set(coverages).size).toBe(CARD_DECKS.length);
  });

  it("rejects a value that names no deck", () => {
    expect([isCardDeckId("art-deco"), isCardDeckId(undefined)]).toEqual([
      false,
      false,
    ]);
  });
});
