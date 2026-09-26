import { Card } from "./card";

/**
 * Names the part a pile plays in its game, such as a stock or a free cell.
 *
 * A plain string because each game declares its own roles; the engine only
 * compares them for equality.
 */
export type PileRole = string;

/**
 * Records which pile each card sits in, so finding a card's pile is a lookup
 * rather than a scan of the whole board.
 */
export class CardLocations<T extends Card = Card> {
  private readonly pileByCardId = new Map<string, CardPile<T>>();

  /** Returns the pile holding the card with the given id, or undefined. */
  get(cardId: string): CardPile<T> | undefined {
    return this.pileByCardId.get(cardId);
  }

  /** Notes that a card now sits in a pile, on behalf of {@link CardPile}. */
  record(cardId: string, pile: CardPile<T>): void {
    this.pileByCardId.set(cardId, pile);
  }

  /** Forgets where a card was, on behalf of {@link CardPile}. */
  forget(cardId: string): void {
    this.pileByCardId.delete(cardId);
  }
}

/** Represents a pile of cards on the board. */
export class CardPile<T extends Card = Card> {
  /** A unique identifier for the card pile (e.g., "stock", "tableau-0"). */
  public readonly id: string;

  /** The part this pile plays, used by rule and scoring logic. */
  public readonly role: PileRole;

  /** The cards in this pile, from the bottom up. */
  protected readonly cards: T[] = [];

  /** The index to tell about every card that joins or leaves, if any. */
  private readonly locations?: CardLocations<T>;

  /**
   * Creates an empty pile.
   *
   * @param role The part this pile plays in its game. The default empty role
   *   matches nothing a game defines, which suits a standalone pile.
   * @param locations The index, shared by every pile in a game, to keep up to
   *   date as cards join and leave.
   */
  constructor(
    id: string = "",
    role: PileRole = "",
    locations?: CardLocations<T>,
  ) {
    this.id = id;
    this.role = role;
    this.locations = locations;
  }

  /** Returns the cards in this pile, from the bottom up. */
  getCards(): ReadonlyArray<T> {
    return this.cards;
  }

  /** The card on top of the pile, the last one added, or undefined if empty. */
  get topCard(): T | undefined {
    return this.cards[this.cards.length - 1];
  }

  /** Whether the pile holds no cards. */
  get isEmpty(): boolean {
    return this.cards.length === 0;
  }

  /** The number of cards in the pile. */
  get size(): number {
    return this.cards.length;
  }

  /** Returns whether the given card is contained in this pile. */
  contains(card: T): boolean {
    return this.cards.includes(card);
  }

  /** Adds a card to the top of the pile. */
  addCard(card: T): void {
    this.cards.push(card);
    this.locations?.record(card.id, this);
  }

  /** Removes a card from the pile. */
  removeCard(card: T): void {
    const index = this.cards.indexOf(card);
    if (index > -1) {
      this.cards.splice(index, 1);
      this.locations?.forget(card.id);
    }
  }

  /** Clears all cards from the pile. */
  clear(): void {
    for (const card of this.cards) {
      this.locations?.forget(card.id);
    }
    this.cards.length = 0;
  }
}
