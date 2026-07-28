import { Card } from "./card";

/**
 * The part a pile plays in whichever game owns it, as an opaque tag.
 *
 * A string and not an enum because the engine has no opinion about what roles
 * exist: Klondike has a stock, a waste, foundations and tableaus, FreeCell has
 * free cells and no stock at all, and poker deals hands. Each game declares its
 * own set and the engine only ever compares them for equality.
 */
export type PileRole = string;

/**
 * Records which pile each card currently sits in, so finding a card's pile is a
 * lookup rather than a scan of the whole board.
 *
 * Maintained by {@link CardPile} itself rather than by the game, which is what
 * keeps it honest: dealing, a move, an undo and a test helper all reach a pile
 * through the same addCard/removeCard/clear, so there is no route that could
 * change a pile without the index hearing about it.
 */
export class CardLocations<T extends Card = Card> {
  private readonly pileByCardId = new Map<string, CardPile<T>>();

  /** The pile holding the card with the given id, or undefined. */
  get(cardId: string): CardPile<T> | undefined {
    return this.pileByCardId.get(cardId);
  }

  /** Notes that a card now sits in a pile. Called by {@link CardPile}. */
  record(cardId: string, pile: CardPile<T>): void {
    this.pileByCardId.set(cardId, pile);
  }

  /** Forgets where a card was. Called by {@link CardPile}. */
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

  /** List of cards contained in this pile. */
  protected readonly cards: T[] = [];

  /** Told about every card that joins or leaves, when the game supplies one. */
  private readonly locations?: CardLocations<T>;

  /**
   * Constructs a card pile.
   *
   * @param id The unique ID for this pile.
   * @param role The part this pile plays in its game. Defaults to the empty
   *   role, which matches nothing a game defines and so behaves as a plain
   *   stack of cards — what a standalone pile in a test wants.
   * @param locations Shared index to keep up to date as cards join and leave.
   *   Optional so a standalone pile needs no ceremony.
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

  /** Returns a readonly list of cards. */
  getCards(): ReadonlyArray<T> {
    return this.cards;
  }

  /**
   * The card on top of the pile — the last one added — or undefined when the
   * pile is empty.
   *
   * Every rule that asks about a pile asks about its top card, so owning the
   * answer here keeps callers from re-deriving `cards[cards.length - 1]`.
   */
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

  /** Adds a card to the pile. */
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
