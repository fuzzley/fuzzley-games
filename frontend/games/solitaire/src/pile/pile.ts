import {Card} from '../card/card';

/** Represents a pile of cards on the board. */
export class Pile {

    private readonly cards: Card[] = [];

    /** Returns a readonly list of cards. */
    public getCards(): ReadonlyArray<Card> {
        return this.cards;
    }

    /** Adds a card to the pile. */
    public addCard(card: Card): void {
        this.cards.push(card);
    }

    /** Removes a card from the pile. */
    public removeCard(card: Card): void {
        const index = this.cards.indexOf(card);
        if (index >= 0) {
            this.cards.splice(index, 1);
        }
    }
}