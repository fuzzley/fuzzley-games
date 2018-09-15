import {Card} from '../card/card';

export class Deck {

    private readonly cards: Card[] = [];

    public addCard(card: Card): void {
        this.cards.push(card);
    }

    public getCards(): Card[] {
        return this.cards.slice();
    }

    public shuffle(): void {
        for (let i = 0; i < this.cards.length; i++) {
            const switchWith = Math.floor(Math.random() * this.cards.length);
            const otherCard = this.cards[switchWith];
            this.cards[switchWith] = this.cards[i];
            this.cards[i] = otherCard;
        }
    }

    private swapCards(index1: number, index2: number): void {
        const card1 = this.cards[index1];
        this.cards[index1] = this.cards[index2];
        this.cards[index2] = card1;
    }
}