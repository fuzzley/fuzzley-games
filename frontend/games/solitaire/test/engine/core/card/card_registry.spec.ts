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

  describe("with more than one deck in play", () => {
    const spadeAceCopy = { ...spadeAce, deckIndex: 1 };

    it("gives the second copy of a card its own instance", () => {
      const first = registry.getOrCreate(spadeAce);

      const second = registry.getOrCreate(spadeAceCopy);

      expect(second).not.toBe(first);
    });

    it("names the two copies differently, so a pile can tell them apart", () => {
      registry.getOrCreate(spadeAce);
      registry.getOrCreate(spadeAceCopy);

      expect(registry.get("card-spades-ace#1")).toBeDefined();
    });

    it("draws both copies from one face, so they look alike", () => {
      const first = registry.getOrCreate(spadeAce);

      const second = registry.getOrCreate(spadeAceCopy);

      expect(second.faceKey).toBe(first.faceKey);
    });

    it("counts both copies", () => {
      registry.getOrCreate(spadeAce);
      registry.getOrCreate(spadeAceCopy);

      expect(registry.size).toBe(2);
    });
  });
});
