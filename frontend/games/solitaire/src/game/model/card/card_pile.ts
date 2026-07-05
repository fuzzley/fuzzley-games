import { Card } from "./card";

/** The role a pile plays in a Klondike game, used to drive rule checks. */
export enum PileType {
  /** The face-down draw pile. */
  STOCK,
  /** The face-up pile of drawn cards. */
  WASTE,
  /** A suit pile built up from Ace to King. */
  FOUNDATION,
  /** A board column built down in alternating colors. */
  TABLEAU,
}

/** Represents a pile of cards on the board. */
export class CardPile<T extends Card = Card> {
  /** A unique identifier for the card pile (e.g., "stock", "tableau-0"). */
  public readonly id: string;

  /** The role this pile plays, used by rule and scoring logic. */
  public readonly type: PileType;

  /** List of cards contained in this pile. */
  protected readonly cards: T[] = [];

  /**
   * Constructs a card pile.
   *
   * @param id The unique ID for this pile.
   * @param type The role this pile plays. Defaults to {@link PileType.TABLEAU},
   *   which suits the generic "stack of cards" behavior used by tests and by
   *   the placeholder piles that visuals fall back to.
   */
  constructor(id: string = "", type: PileType = PileType.TABLEAU) {
    this.id = id;
    this.type = type;
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
