import { describe, it, expect } from "vitest";
import { Card } from "../../../src/card/card";
import { CardPile } from "../../../src/card/card_pile";

describe("CardPile", () => {
  const card1: Card = { faceUp: false };
  const card2: Card = { faceUp: true };

  it("should start with an empty list of cards", () => {
    const pile = new CardPile();
    expect(pile.getCards()).toEqual([]);
  });

  it("should allow adding cards to the pile", () => {
    const pile = new CardPile();

    pile.addCard(card1);
    pile.addCard(card2);

    expect(pile.getCards()).toEqual([card1, card2]);
  });

  it("should allow removing cards from the pile", () => {
    const pile = new CardPile();
    pile.addCard(card1);
    pile.addCard(card2);

    pile.removeCard(card1);

    expect(pile.getCards()).toEqual([card2]);
  });

  it("should ignore removing a card that does not exist in the pile", () => {
    const pile = new CardPile();
    pile.addCard(card2);

    pile.removeCard(card1);

    expect(pile.getCards()).toEqual([card2]);
  });
});
