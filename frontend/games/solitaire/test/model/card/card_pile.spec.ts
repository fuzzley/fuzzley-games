import { Card } from "../../../src/model/card/card";
import { CardPile } from "../../../src/model/card/card_pile";

describe("CardPile", () => {
  it("should initialize with an empty array of cards and correct id", () => {
    const pile = new CardPile("test-pile");
    expect(pile.id).toBe("test-pile");
    expect(pile.getCards()).toEqual([]);
  });

  it("should add cards and retrieve them", () => {
    const pile = new CardPile("test-pile");
    const card1: Card = { id: "card-1", faceUp: true };
    const card2: Card = { id: "card-2", faceUp: false };

    pile.addCard(card1);
    pile.addCard(card2);

    expect(pile.getCards()).toEqual([card1, card2]);
  });

  it("should remove cards if they exist in the pile", () => {
    const pile = new CardPile("test-pile");
    const card1: Card = { id: "card-1", faceUp: true };
    const card2: Card = { id: "card-2", faceUp: false };
    pile.addCard(card1);
    pile.addCard(card2);

    pile.removeCard(card1);

    expect(pile.getCards()).toEqual([card2]);
  });

  it("should do nothing when trying to remove a card not in the pile", () => {
    const pile = new CardPile("test-pile");
    const card1: Card = { id: "card-1", faceUp: true };
    const card2: Card = { id: "card-2", faceUp: false };
    pile.addCard(card2);

    pile.removeCard(card1);

    expect(pile.getCards()).toEqual([card2]);
  });

  it("should clear all cards", () => {
    const pile = new CardPile("test-pile");
    const card1: Card = { id: "card-1", faceUp: true };
    pile.addCard(card1);

    pile.clear();

    expect(pile.getCards().length).toBe(0);
  });
});
