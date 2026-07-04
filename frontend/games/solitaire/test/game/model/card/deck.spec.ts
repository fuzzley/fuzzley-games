import { Deck } from "@/game/model/card/deck";
import { makeCard } from "@test/support/card_builder";
import { sequenceRandom } from "@test/support/sequence_random";

describe("Deck", () => {
  let deck: Deck;

  beforeEach(() => {
    deck = new Deck();
  });

  it("adds a card", () => {
    const card = makeCard({ id: "c1", faceUp: true });

    deck.addCard(card);

    expect(deck.getCards()).toEqual([card]);
  });

  it("shuffles the cards using the provided randomness source", () => {
    const card1 = makeCard({ id: "c1", faceUp: true });
    const card2 = makeCard({ id: "c2", faceUp: true });
    const card3 = makeCard({ id: "c3", faceUp: true });
    deck.addCard(card1);
    deck.addCard(card2);
    deck.addCard(card3);

    deck.shuffle(sequenceRandom([0.6, 0.2, 0.8]));

    expect(deck.getCards()).toEqual([card3, card1, card2]);
  });
});
