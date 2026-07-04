import { Card } from "./card";

/** Represents a pile of cards on the board. */
export class CardPile<T extends Card = Card> {
  /** A unique identifier for the card pile (e.g., "stock", "tableau-0"). */
  public readonly id: string;

  /** List of cards contained in this pile. */
  protected readonly cards: T[] = [];

  /**
   * Constructs a card pile with a unique identifier.
   *
   * @param id The unique ID for this pile.
   */
  constructor(id: string = "") {
    this.id = id;
  }

  /** Returns a readonly list of cards. */
  getCards(): ReadonlyArray<T> {
    return this.cards;
  }

  /** Adds a card to the pile. */
  addCard(card: T): void {
    this.cards.push(card);
  }

  /** Removes a card from the pile. */
  removeCard(card: T): void {
    const index = this.cards.indexOf(card);
    if (index > -1) {
      this.cards.splice(index, 1);
    }
  }

  /** Clears all cards from the pile. */
  clear(): void {
    this.cards.length = 0;
  }
}
