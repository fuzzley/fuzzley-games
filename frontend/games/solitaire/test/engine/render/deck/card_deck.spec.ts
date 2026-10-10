import { describe, it, expect } from "vitest";
import {
  CARD_DECKS,
  DEFAULT_DESKTOP_CARD_DECK,
  DESKTOP_CARD_DECKS,
  MOBILE_CARD_DECK,
  isDesktopCardDeckId,
} from "@/engine/render/deck/card_deck";

describe("card decks", () => {
  it("names every deck once", () => {
    const ids = CARD_DECKS.map((deck) => deck.id);

    expect(ids).toEqual([...new Set(ids)]);
  });

  it("can draw every desktop deck and the mobile deck", () => {
    expect(CARD_DECKS).toEqual([...DESKTOP_CARD_DECKS, MOBILE_CARD_DECK]);
  });

  it("offers the desktop deck a new player is given", () => {
    // Otherwise the drawer would check no deck and the loader would ask for an
    // atlas that is not built.
    expect(isDesktopCardDeckId(DEFAULT_DESKTOP_CARD_DECK)).toBe(true);
  });

  it("gives every deck a name", () => {
    const named = CARD_DECKS.filter((deck) => deck.name.length > 0);

    expect(named).toEqual(CARD_DECKS);
  });

  it("gives every desktop deck a line to read", () => {
    const described = DESKTOP_CARD_DECKS.filter(
      (deck) => deck.description.length > 0,
    );

    expect(described).toEqual(DESKTOP_CARD_DECKS);
  });

  it("gives every desktop deck pips no other deck draws alike", () => {
    // The drawer previews the pips, so two decks sharing them would look
    // alike.
    const coverage = DESKTOP_CARD_DECKS.map((deck) => deck.pipCoverage);

    expect(new Set(coverage).size).toBe(DESKTOP_CARD_DECKS.length);
  });

  it("rejects a value that names no desktop deck", () => {
    expect([
      isDesktopCardDeckId("art-deco"),
      isDesktopCardDeckId(MOBILE_CARD_DECK.id),
      isDesktopCardDeckId(undefined),
    ]).toEqual([false, false, false]);
  });
});
