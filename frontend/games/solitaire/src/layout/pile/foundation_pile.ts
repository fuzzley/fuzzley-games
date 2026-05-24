import { Card } from "../../card/card";
import { CardPile } from "./card_pile";

/** Represents the foundation pile, where cards are built up by suit. */
export class FoundationPile implements CardPile {
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
