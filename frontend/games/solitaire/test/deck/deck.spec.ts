import 'jasmine';

import { Card } from '../../src/card/card';
import { Deck } from '../../src/deck/deck';

describe('Deck', () => {
  let deck: Deck;

  beforeEach(() => {
    deck = new Deck();
  });

  it('adds a card', () => {
    const card: Card = { faceUp: true };

    deck.addCard(card);

    expect(deck.getCards()).toEqual([card]);
  });

  it('shuffles the cards', () => {
    const card1: Card = { faceUp: true };
    const card2: Card = { faceUp: true };
    const card3: Card = { faceUp: true };
    deck.addCard(card1);
    deck.addCard(card2);
    deck.addCard(card3);
    spyOn(Math, 'random').and.returnValues(0.6, 0.2, 0.8);

    deck.shuffle();

    expect(deck.getCards()).toEqual([card3, card2, card1]);
  });
});
