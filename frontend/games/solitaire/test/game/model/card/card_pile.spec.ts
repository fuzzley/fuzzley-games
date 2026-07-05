import { CardPile, PileType } from "@/game/model/card/card_pile";
import { makeCard } from "@test/support/card_builder";

describe("CardPile", () => {
  it("uses the id it was constructed with", () => {
    const pile = new CardPile("test-pile");

    expect(pile.id).toBe("test-pile");
  });

  it("exposes the pile type it was constructed with", () => {
    const pile = new CardPile("foundation-0", PileType.FOUNDATION);

    expect(pile.type).toBe(PileType.FOUNDATION);
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
