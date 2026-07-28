import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { IntentHandler } from "@/engine/render/input/table_intents";
import { KlondikeRole } from "./klondike_zones";
import { SolitaireGame } from "./solitaire_game";

/** The cards from `cardId` upwards, which is what a move of it takes along. */
function stackFrom(
  pile: CardPile<PlayingCard>,
  cardId: string,
): readonly string[] {
  const cards = pile.getCards();
  const index = cards.findIndex((card) => card.id === cardId);
  return index === -1 ? [] : cards.slice(index).map((card) => card.id);
}

/**
 * What a press or a drop means in Klondike.
 *
 * Pressing the top of the stock draws. Pressing the empty stock recycles the
 * waste. Double-pressing a card in the tableau or the waste sends it wherever
 * it will go. Everything else about handling a pointer — hover, the double
 * press window, the stack in hand, the flight afterwards — is the engine's, and
 * is the same in every game.
 *
 * @param game The game to act on.
 */
export function klondikeGestures(game: SolitaireGame): IntentHandler {
  return (intent) => {
    switch (intent.kind) {
      case "activate": {
        const pile = game.getPileContainingCard(intent.cardId);
        // Every card in play is in some pile. A press on one that is not means
        // the board and its sprites have drifted apart, which should fail
        // loudly rather than quietly do nothing.
        if (!pile) {
          throw new Error(`Card ${intent.cardId} is not in a pile`);
        }
        // Only the top of the stock draws; pressing a card buried in it does
        // nothing, and pressing anything else is handled on the second press.
        if (
          pile.role === KlondikeRole.STOCK &&
          pile.topCard?.id === intent.cardId
        ) {
          game.drawCardsFromStock();
        }
        return;
      }

      case "activate-secondary": {
        const pile = game.getPileContainingCard(intent.cardId);
        if (
          pile?.role === KlondikeRole.TABLEAU ||
          pile?.role === KlondikeRole.WASTE
        ) {
          game.autoMoveCard(intent.cardId);
        }
        return;
      }

      case "activate-pile": {
        if (intent.pileId === game.stock.id && game.stock.isEmpty) {
          game.drawCardsFromStock();
        }
        return;
      }

      case "drop": {
        const [primaryCardId] = intent.cardIds;
        if (intent.targetPileId && primaryCardId) {
          game.moveCardToPile(primaryCardId, intent.targetPileId);
        }
        return;
      }
    }
  };
}

/**
 * The cards a drag of the given card picks up: it and everything resting on it.
 *
 * @param game The game to read.
 */
export function klondikeStackFromCard(
  game: SolitaireGame,
): (cardId: string) => readonly string[] {
  return (cardId) => {
    const pile = game.getPileContainingCard(cardId);
    return pile ? stackFrom(pile, cardId) : [];
  };
}
