import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import {
  PlayingCard,
  playingCardInstanceId,
} from "@/engine/core/card/playing_card";
import { KlondikeGame } from "@/games/klondike/klondike_game";
import { emptyBoard } from "@test/support/game_scenarios";

/** Id of the only card left out of the foundations by {@link almostWon}. */
export const CLUB_KING_ID = "card-clubs-king";

/**
 * Forces a waste-to-stock recycle: empties the stock, places a single card in
 * the waste, and draws so the game recycles the waste back into the stock.
 *
 * Klondike's own, and deliberately not in the shared scenarios: a stock, a
 * waste and a draw are three things most of the games here do not have.
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
