import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/**
 * As much of a dealt game as building an exact position needs.
 *
 * Structural rather than a game class, so every game can use these: the board
 * is the same shape whichever solitaire is on it, and a helper that named
 * `KlondikeGame` would have to be copied once per variant. Helpers that really
 * do need a particular game — one that draws from a stock, say — belong beside
 * that game's specs rather than here.
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
 * Moves the card with the given id out of whatever pile currently holds it and
 * onto the target pile, returning the card. The game must already have been
 * started so the card exists in the model.
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
