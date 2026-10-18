import {
  DeckCardId,
  PlayingCard,
  playingCardFaceKey,
  playingCardInstanceId,
} from "./playing_card";

/**
 * Owns the single persistent {@link PlayingCard} instance for each card
 * identity.
 *
 * Every deal reuses these instances because the render layer's sprites hold
 * references to them.
 */
export class CardRegistry {
  private readonly cardsById = new Map<string, PlayingCard>();

  /** The number of distinct cards that have been registered. */
  get size(): number {
    return this.cardsById.size;
  }

  /** Returns the id of every card registered so far, in registration order. */
  ids(): readonly string[] {
    return [...this.cardsById.keys()];
  }

  /**
   * Returns the registered card with the given id, or undefined if no card
   * with that id has been created yet.
   */
  get(id: string): PlayingCard | undefined {
    return this.cardsById.get(id);
  }

  /**
   * Returns the persistent card for an identity, creating it on first request.
   *
   * Cards are keyed by deck index as well as face, so a game dealing two decks
   * gets two distinct Queens of Hearts.
   */
  getOrCreate(cardId: DeckCardId): PlayingCard {
    const id = playingCardInstanceId(cardId);
    let card = this.cardsById.get(id);
    if (!card) {
      card = new PlayingCard(
        id,
        cardId.suit,
        cardId.rank,
        false,
        playingCardFaceKey(cardId),
      );
      this.cardsById.set(id, card);
    }
    return card;
  }
}
