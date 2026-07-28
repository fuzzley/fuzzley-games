import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { IntentHandler } from "@/engine/render/input/table_intents";
import { canGrab } from "@/engine/tableau/zone";
import { SpiderGame } from "./spider_game";
import { SpiderRole } from "./spider_zones";

/** The cards from `cardId` upwards. */
function stackFrom(
  pile: CardPile<PlayingCard>,
  cardId: string,
): readonly string[] {
  const cards = pile.getCards();
  const index = cards.findIndex((card) => card.id === cardId);
  return index === -1 ? [] : cards.slice(index).map((card) => card.id);
}

/**
 * What a press or a drop means in Spider.
 *
 * Pressing the stock deals a row — to every column at once, not to a waste.
 * Double-pressing a card sends it wherever it will go.
 */
export function spiderGestures(game: SpiderGame): IntentHandler {
  return (intent) => {
    switch (intent.kind) {
      case "activate": {
        const pile = game.getPileContainingCard(intent.cardId);
        if (pile?.role === SpiderRole.STOCK) {
          game.dealRow();
        }
        return [];
      }

      case "activate-pile": {
        // The stock's slot is only pressable once it is empty, at which point
        // there is nothing left to deal.
        return [];
      }

      case "activate-secondary": {
        const pile = game.getPileContainingCard(intent.cardId);
        if (pile?.role !== SpiderRole.TABLEAU) return [];
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
 * zone says that run may be lifted — in Spider, a same-suit sequence.
 */
export function spiderStackFromCard(
  game: SpiderGame,
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
