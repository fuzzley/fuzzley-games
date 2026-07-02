import { Card } from "../../../src/model/card/card";
import { Deck } from "../../../src/model/card/deck";

describe("Deck", () => {
  let deck: Deck;

  beforeEach(() => {
    deck = new Deck();
  });

  it("adds a card", () => {
    const card: Card = { id: "c1", faceUp: true };

    deck.addCard(card);

    expect(deck.getCards()).toEqual([card]);
  });

  it("shuffles the cards", () => {
    const card1: Card = { id: "c1", faceUp: true };
    const card2: Card = { id: "c2", faceUp: true };
    const card3: Card = { id: "c3", faceUp: true };
    deck.addCard(card1);
    deck.addCard(card2);
    deck.addCard(card3);
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.6)
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0.8);

    deck.shuffle();

    expect(deck.getCards()).toEqual([card3, card1, card2]);
  });
});
