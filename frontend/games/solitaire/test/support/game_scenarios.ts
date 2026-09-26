import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/**
 * Exposes as much of any dealt game as building an exact position needs.
 *
 * Helpers that need a particular game belong beside that game's specs.
 */
export interface DealtBoard {
  readonly piles: readonly CardPile<PlayingCard>[];
  getCardById(cardId: string): PlayingCard | undefined;
  getPileContainingCard(cardId: string): CardPile<PlayingCard> | undefined;
}

/** Empties every pile on the board so a test can build an exact position. */
export function emptyBoard(game: DealtBoard): void {
  game.piles.forEach((pile) => pile.clear());
}

/**
 * Moves a card from whatever pile holds it onto the target pile, and returns
 * it.
 *
 * The game must already be dealt, so the card exists.
 */
export function relocate(
  game: DealtBoard,
  cardId: string,
  targetPile: CardPile<PlayingCard>,
  faceUp = true,
): PlayingCard {
  const card = game.getCardById(cardId)!;
  game.getPileContainingCard(cardId)?.removeCard(card);
  card.faceUp = faceUp;
  targetPile.addCard(card);
  return card;
}
