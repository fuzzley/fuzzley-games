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
 * The render layer's visuals hold references to these instances, so every deal
 * reuses the same objects rather than recreating them. The registry is the one
 * place that guarantees that identity, which keeps the model and its rendered
 * sprites in sync across restarts.
 */
export class CardRegistry {
  private readonly cardsById = new Map<string, PlayingCard>();

  /** The number of distinct cards that have been registered. */
  get size(): number {
    return this.cardsById.size;
  }

  /**
   * Returns the registered card with the given id, or undefined if no card
   * with that id has been created yet.
   */
  get(id: string): PlayingCard | undefined {
    return this.cardsById.get(id);
  }

  /**
   * Returns the persistent card for the given identity, creating and storing it
   * on first request. The same instance is returned on every subsequent call.
   *
   * Keyed by instance id rather than by face, so a game dealing two decks gets
   * two distinct Queens of Hearts instead of one shared between both piles.
   *
   * @param cardId The suit, rank and deck index identifying the card.
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
