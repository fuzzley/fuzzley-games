import { CardLocations, CardPile } from "@/engine/core/card/card_pile";
import { KlondikeRole } from "@/games/klondike/klondike_zones";
import { makeCard } from "@test/support/card_builder";

describe("CardPile", () => {
  it("uses the id it was constructed with", () => {
    const pile = new CardPile("test-pile");

    expect(pile.id).toBe("test-pile");
  });

  it("exposes the pile type it was constructed with", () => {
    const pile = new CardPile("foundation-0", KlondikeRole.FOUNDATION);

    expect(pile.role).toBe(KlondikeRole.FOUNDATION);
  });

  it("starts empty", () => {
    const pile = new CardPile("test-pile");

    expect(pile.getCards()).toEqual([]);
  });

  it("keeps added cards in insertion order", () => {
    const pile = new CardPile("test-pile");
    const card1 = makeCard({ id: "card-1", faceUp: true });
    const card2 = makeCard({ id: "card-2" });

    pile.addCard(card1);
    pile.addCard(card2);

    expect(pile.getCards()).toEqual([card1, card2]);
  });

  it("contains a card that was added to it", () => {
    const pile = new CardPile("test-pile");
    const card = makeCard({ id: "present" });
    pile.addCard(card);

    expect(pile.contains(card)).toBe(true);
  });

  it("does not contain a card that was never added", () => {
    const pile = new CardPile("test-pile");
    pile.addCard(makeCard({ id: "present" }));
    const absent = makeCard({ id: "absent" });

    expect(pile.contains(absent)).toBe(false);
  });

  it("removes a card that exists in the pile", () => {
    const pile = new CardPile("test-pile");
    const card1 = makeCard({ id: "card-1" });
    const card2 = makeCard({ id: "card-2" });
    pile.addCard(card1);
    pile.addCard(card2);

    pile.removeCard(card1);

    expect(pile.getCards()).toEqual([card2]);
  });

  it("leaves the pile unchanged when removing a card not in it", () => {
    const pile = new CardPile("test-pile");
    const present = makeCard({ id: "present" });
    const absent = makeCard({ id: "absent" });
    pile.addCard(present);

    pile.removeCard(absent);

    expect(pile.getCards()).toEqual([present]);
  });

  it("removes all cards when cleared", () => {
    const pile = new CardPile("test-pile");
    pile.addCard(makeCard({ id: "card-1" }));

    pile.clear();

    expect(pile.getCards()).toEqual([]);
  });
});

describe("CardPile.topCard", () => {
  it("is the last card added", () => {
    const pile = new CardPile();
    const bottom = makeCard({ id: "bottom" });
    const top = makeCard({ id: "top" });
    pile.addCard(bottom);
    pile.addCard(top);

    expect(pile.topCard).toBe(top);
  });

  it("is undefined for an empty pile", () => {
    const pile = new CardPile();

    expect(pile.topCard).toBeUndefined();
  });

  it("falls back to the card beneath once the top one is removed", () => {
    const pile = new CardPile();
    const bottom = makeCard({ id: "bottom" });
    const top = makeCard({ id: "top" });
    pile.addCard(bottom);
    pile.addCard(top);

    pile.removeCard(top);

    expect(pile.topCard).toBe(bottom);
  });
});

describe("CardPile.isEmpty", () => {
  it("is true for a new pile", () => {
    const pile = new CardPile();

    expect(pile.isEmpty).toBe(true);
  });

  it("is false once a card is added", () => {
    const pile = new CardPile();

    pile.addCard(makeCard());

    expect(pile.isEmpty).toBe(false);
  });

  it("is true again after the pile is cleared", () => {
    const pile = new CardPile();
    pile.addCard(makeCard());

    pile.clear();

    expect(pile.isEmpty).toBe(true);
  });
});

describe("CardPile.size", () => {
  it("counts the cards in the pile", () => {
    const pile = new CardPile();
    pile.addCard(makeCard({ id: "a" }));
    pile.addCard(makeCard({ id: "b" }));

    expect(pile.size).toBe(2);
  });
});

describe("CardPile with a shared location index", () => {
  it("records a card against the pile it is added to", () => {
    const locations = new CardLocations();
    const pile = new CardPile("tableau-0", KlondikeRole.TABLEAU, locations);
    const card = makeCard({ id: "a" });

    pile.addCard(card);

    expect(locations.get("a")).toBe(pile);
  });

  it("forgets a card that is removed", () => {
    const locations = new CardLocations();
    const pile = new CardPile("tableau-0", KlondikeRole.TABLEAU, locations);
    const card = makeCard({ id: "a" });
    pile.addCard(card);

    pile.removeCard(card);

    expect(locations.get("a")).toBeUndefined();
  });

  it("forgets every card when the pile is cleared", () => {
    const locations = new CardLocations();
    const pile = new CardPile("tableau-0", KlondikeRole.TABLEAU, locations);
    pile.addCard(makeCard({ id: "a" }));
    pile.addCard(makeCard({ id: "b" }));

    pile.clear();

    expect([locations.get("a"), locations.get("b")]).toEqual([
      undefined,
      undefined,
    ]);
  });

  it("follows a card moved from one pile to another", () => {
    const locations = new CardLocations();
    const source = new CardPile("tableau-0", KlondikeRole.TABLEAU, locations);
    const target = new CardPile("tableau-1", KlondikeRole.TABLEAU, locations);
    const card = makeCard({ id: "a" });
    source.addCard(card);

    source.removeCard(card);
    target.addCard(card);

    expect(locations.get("a")).toBe(target);
  });

  it("leaves the index alone when removing a card the pile never held", () => {
    const locations = new CardLocations();
    const holder = new CardPile("tableau-0", KlondikeRole.TABLEAU, locations);
    const other = new CardPile("tableau-1", KlondikeRole.TABLEAU, locations);
    const card = makeCard({ id: "a" });
    holder.addCard(card);

    other.removeCard(card);

    expect(locations.get("a")).toBe(holder);
  });

  it("works without an index, for a standalone pile", () => {
    const pile = new CardPile();

    expect(() => pile.addCard(makeCard({ id: "a" }))).not.toThrow();
  });
});
