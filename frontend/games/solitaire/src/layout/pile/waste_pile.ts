import { Card } from "../../card/card";
import { CardPile } from "./card_pile";

/** Represents the waste pile, holding cards turned up from the stock pile. */
export class WastePile implements CardPile {
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
