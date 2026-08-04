import { IntentHandler } from "@/engine/render/input/table_intents";
import { FortyThievesGame } from "./forty_thieves_game";
import { FortyThievesRole } from "./forty_thieves_zones";

/**
 * What a press or a drop means in Forty Thieves.
 *
 * Pressing the top of the stock draws one card. Double-pressing a card in a
 * column or on the waste sends it to a foundation if it will go.
 *
 * Klondike's gesture map minus its recycle: there is no `activate-pile` case
 * because an emptied stock does nothing at all here, and the zone accordingly
 * does not mark its empty slot actionable. A press that silently did nothing
 * would be worse than no press at all — it would suggest the stock might come
 * back.
 */
export function fortyThievesGestures(game: FortyThievesGame): IntentHandler {
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
          pile.role === FortyThievesRole.STOCK &&
          pile.topCard?.id === intent.cardId
        ) {
          game.drawCard();
        }
        return;
      }

      case "activate-pile":
        // Nothing to do: an empty stock is spent for good.
        return;

      case "activate-secondary": {
        const pile = game.getPileContainingCard(intent.cardId);
        if (
          pile?.role === FortyThievesRole.TABLEAU ||
          pile?.role === FortyThievesRole.WASTE
        ) {
          game.autoMoveCard(intent.cardId);
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
