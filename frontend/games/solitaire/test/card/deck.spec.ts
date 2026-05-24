import { Card } from "../../src/card/card";
import { Deck } from "../../src/card/deck";

describe("Deck", () => {
  let deck: Deck;

  beforeEach(() => {
    deck = new Deck();
  });

  it("adds a card", () => {
    const card: Card = { faceUp: true };

    deck.addCard(card);

    expect(deck.getCards()).toEqual([card]);
  });

  it("shuffles the cards", () => {
    const card1: Card = { faceUp: true };
    const card2: Card = { faceUp: true };
    const card3: Card = { faceUp: true };
    deck.addCard(card1);
    deck.addCard(card2);
    deck.addCard(card3);
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.6)
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0.8);

    deck.shuffle();

    expect(deck.getCards()).toEqual([card3, card2, card1]);
  });
});
