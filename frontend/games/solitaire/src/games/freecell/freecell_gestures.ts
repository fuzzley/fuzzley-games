import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { IntentHandler } from "@/engine/render/input/table_intents";
import { canGrab } from "@/engine/tableau/zone";
import { FreeCellGame } from "./freecell_game";

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
 * What a press or a drop means in FreeCell.
 *
 * Shorter than Klondike's, because there is no stock: a single press does
 * nothing at all, and there is no empty slot whose click means anything. A
 * double press sends a card wherever it will go.
 */
export function freeCellGestures(game: FreeCellGame): IntentHandler {
  return (intent) => {
    switch (intent.kind) {
      case "activate":
      case "activate-pile":
        // Nothing in FreeCell responds to a single press.
        return [];

      case "activate-secondary": {
        const pile = game.getPileContainingCard(intent.cardId);
        if (!pile) return [];
        const moving = stackFrom(pile, intent.cardId);
        return game.autoMoveCard(intent.cardId) ? moving : [];
      }

      case "drop": {
        const [primaryCardId] = intent.cardIds;
        if (!intent.targetPileId || !primaryCardId) return [];
        return game.moveCardToPile(primaryCardId, intent.targetPileId)
          ? intent.cardIds
          : [];
      }
    }
  };
}

/**
 * The cards a drag picks up: the card and everything on it, but only when its
 * zone says that run may be lifted at all.
 */
export function freeCellStackFromCard(
  game: FreeCellGame,
): (cardId: string) => readonly string[] {
  return (cardId) => {
    const pile = game.getPileContainingCard(cardId);
    const card = game.getCardById(cardId);
    const zone = pile ? game.zoneFor(pile.id) : undefined;
    if (!pile || !card || !zone || !canGrab(zone.grab, card, pile)) {
      return [];
    }
    return stackFrom(pile, cardId);
  };
}
