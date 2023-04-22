import {Card} from '../../src/card/card';
import {Pile} from '../../src/card/pile';

describe('Pile', () => {

    let pile: Pile;

    beforeEach(() => {
        pile = new Pile();
    });

    it('adds a card', () => {
        const card: Card = {faceUp: true};

        pile.addCard(card);

        expect(pile.getCards()).toEqual([card]);
    });

    it('removes a card', () => {
        const card: Card = {faceUp: true};
        pile.addCard(card);

        pile.removeCard(card);

        expect(pile.getCards()).toEqual([]);
    });

    it ('does not remove a card if it is not in the pile', () => {
        const cardInPile: Card = {faceUp: true};
        pile.addCard(cardInPile);
        const someOtherCard: Card = {faceUp: true};

        pile.removeCard(someOtherCard);

        expect(pile.getCards()).toEqual([cardInPile]);
    });
});