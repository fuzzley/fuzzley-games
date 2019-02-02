import { Card } from '../card/card';

/** A deck tracks a collection of cards. */
export class Deck {
  private readonly cards: Card[] = [];

  /** Adds a card to the deck. */
  public addCard(card: Card): void {
    this.cards.push(card);
  }

  /** Returns a readonly list of cards in the deck. */
  public getCards(): ReadonlyArray<Card> {
    return this.cards;
  }

  /** Shuffles the cards in the deck. */
  public shuffle(): void {
    // Fisher-Yates shuffle
    for (let i = this.cards.length - 1; i > 0; i--) {
      const randomIndex = Math.floor(Math.random() * (i + 1));
      this.swapCards(i, randomIndex);
    }
  }

  private swapCards(index1: number, index2: number): void {
    [this.cards[index1], this.cards[index2]] = [this.cards[index2], this.cards[index1]];
  }
}
