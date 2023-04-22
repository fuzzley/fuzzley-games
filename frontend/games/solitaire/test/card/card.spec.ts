import {Card} from '../../src/card/card';

describe('Card', () => {
    it('can be created', () => {
        const card: Card = {faceUp: true};
        expect(card).toBeDefined();
    });
});