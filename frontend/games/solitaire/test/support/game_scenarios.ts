import { CardPile } from "@/engine/core/card/card_pile";
import {
  PlayingCard,
  playingCardInstanceId,
} from "@/engine/core/card/playing_card";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { KlondikeGame } from "@/games/klondike/klondike_game";

/** Id of the only card left out of the foundations by {@link almostWon}. */
export const CLUB_KING_ID = "card-clubs-king";

/**
 * As much of a dealt game as building an exact position needs.
 *
 * Structural rather than a game class, so every game can use these: the board
 * is the same shape whichever solitaire is on it, and a helper that named
 * `KlondikeGame` would have to be copied once per variant.
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

/**
 * Forces a waste-to-stock recycle: empties the stock, places a single card in
 * the waste, and draws so the game recycles the waste back into the stock.
 */
export function forceWasteRecycle(game: KlondikeGame, card: PlayingCard): void {
  game.stock.clear();
  game.waste.clear();
  game.waste.addCard(card);
  game.drawCardsFromStock();
}

/**
 * Places 51 of the 52 cards face-up on their suit foundations, leaving only the
 * King of Clubs out, so a single move can complete the game. The game must
 * already have been started so the cards exist in the model.
 */
export function almostWon(game: KlondikeGame): void {
  emptyBoard(game);
  for (const cardId of ALL_PLAYING_CARD_IDS) {
    const id = playingCardInstanceId(cardId);
    if (id === CLUB_KING_ID) {
      continue;
    }
    const card = game.getCardById(id)!;
    card.faceUp = true;
    game.foundations[cardId.suit].addCard(card);
  }
}
