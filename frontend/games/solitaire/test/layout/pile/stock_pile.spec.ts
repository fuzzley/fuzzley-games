import { describe, it, expect } from "vitest";
import { Card } from "../../../src/card/card";
import { StockPile } from "../../../src/layout/pile/stock_pile";

describe("StockPile", () => {
  const card1: Card = { faceUp: false };
  const card2: Card = { faceUp: true };

  it("should start with an empty list of cards", () => {
    const pile = new StockPile();
    expect(pile.getCards()).toEqual([]);
  });

  it("should allow adding cards to the pile", () => {
    const pile = new StockPile();

    pile.addCard(card1);
    pile.addCard(card2);

    expect(pile.getCards()).toEqual([card1, card2]);
  });

  it("should allow removing cards from the pile", () => {
    const pile = new StockPile();
    pile.addCard(card1);
    pile.addCard(card2);

    pile.removeCard(card1);

    expect(pile.getCards()).toEqual([card2]);
  });

  it("should ignore removing a card that does not exist in the pile", () => {
    const pile = new StockPile();
    pile.addCard(card2);

    pile.removeCard(card1);

    expect(pile.getCards()).toEqual([card2]);
  });
});
