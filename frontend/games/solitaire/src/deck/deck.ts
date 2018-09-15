import {Card} from '../card/card';

/** A deck tracks a collection of cards. */
export class Deck {

    private readonly cards: Card[] = [];

    /** Adds a card to the deck. */
    public addCard(card: Card): void {
        this.cards.push(card);
    }

    /** Returns the cards in the deck. */
    public getCards(): Card[] {
        return this.cards.slice();
    }

    /** Shuffles the deck. */
    public shuffle(): void {
        for (let i = 0; i < this.cards.length; i++) {
            this.swapCards(i, Math.floor(Math.random() * this.cards.length));
        }
    }

    private swapCards(index1: number, index2: number): void {
        const card1 = this.cards[index1];
        this.cards[index1] = this.cards[index2];
        this.cards[index2] = card1;
    }
}