import { Card } from "./card";

/** Represents a pile of cards on the board. */
export class CardPile {
  protected readonly cards: Card[] = [];

  /** Returns a readonly list of cards. */
  getCards(): ReadonlyArray<Card> {
    return this.cards;
  }

  /** Adds a card to the pile. */
  addCard(card: Card): void {
    this.cards.push(card);
  }

  /** Removes a card from the pile. */
  removeCard(card: Card): void {
    const index = this.cards.indexOf(card);
    if (index > -1) {
      this.cards.splice(index, 1);
    }
  }
}
