import { Card } from "../../card/card";
import { CardPile } from "./card_pile";

/** Represents a tableau pile on the board. */
export class TableauPile implements CardPile {
    private readonly cards: Card[] = [];

    getCards(): ReadonlyArray<Card> {
        return this.cards;
    }

    addCard(card: Card): void {
        this.cards.push(card);
    }

    removeCard(card: Card): void {
        const index = this.cards.indexOf(card);
        if (index > -1) {
            this.cards.splice(index, 1);
        }
    }
}
