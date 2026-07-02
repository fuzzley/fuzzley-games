import { Card } from "./card";

/** Represents a pile of cards on the board. */
export class CardPile {
  /** A unique identifier for the card pile (e.g., "stock", "tableau-0"). */
  public readonly id: string;

  protected readonly cards: Card[] = [];

  /**
   * Constructs a card pile with a unique identifier.
   *
   * @param id The unique ID for this pile.
   */
  constructor(id: string = "") {
    this.id = id;
  }

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

  /** Clears all cards from the pile. */
  clear(): void {
    this.cards.length = 0;
  }
}
