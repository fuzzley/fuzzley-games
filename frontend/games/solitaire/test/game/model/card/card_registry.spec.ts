import { describe, it, expect, beforeEach } from "vitest";
import { CardRegistry } from "@/game/model/card/card_registry";
import { Suit, Type } from "@/game/model/card/playing_card";

describe("CardRegistry", () => {
  let registry: CardRegistry;
  const spadeAce = { suit: Suit.SPADE, type: Type.ACE };

  beforeEach(() => {
    registry = new CardRegistry();
  });

  it("creates a card with the requested identity", () => {
    const card = registry.getOrCreate(spadeAce);

    expect(card.id).toBe("card-spades-ace");
    expect(card.suit).toBe(Suit.SPADE);
    expect(card.type).toBe(Type.ACE);
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
    registry.getOrCreate({ suit: Suit.HEART, type: Type.KING });

    expect(registry.size).toBe(2);
  });
});
