import { describe, it, expect, beforeEach } from "vitest";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { Suit, Rank } from "@/engine/core/card/playing_card";

describe("CardRegistry", () => {
  let registry: CardRegistry;
  const spadeAce = { suit: Suit.SPADE, rank: Rank.ACE };

  beforeEach(() => {
    registry = new CardRegistry();
  });

  it("creates a card with the requested identity", () => {
    const card = registry.getOrCreate(spadeAce);

    expect(card.id).toBe("card-spades-ace");
    expect(card.suit).toBe(Suit.SPADE);
    expect(card.rank).toBe(Rank.ACE);
  });

  it("returns the same instance for a repeated identity", () => {
    const first = registry.getOrCreate(spadeAce);

    const second = registry.getOrCreate(spadeAce);

    expect(second).toBe(first);
  });

  it("looks up a registered card by its id", () => {
    const card = registry.getOrCreate(spadeAce);

    expect(registry.get("card-spades-ace")).toBe(card);
  });

  it("returns undefined for an unregistered id", () => {
    expect(registry.get("card-spades-ace")).toBeUndefined();
  });

  it("counts each distinct card once", () => {
    registry.getOrCreate(spadeAce);
    registry.getOrCreate(spadeAce);
    registry.getOrCreate({ suit: Suit.HEART, rank: Rank.KING });

    expect(registry.size).toBe(2);
  });
});
