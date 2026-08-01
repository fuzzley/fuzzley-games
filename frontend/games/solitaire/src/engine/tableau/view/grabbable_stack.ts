import { canGrab } from "../zone";
import { TableView } from "./table_view";

/**
 * The cards a drag of the given card picks up: it and everything resting on it,
 * but only when the zone holding it says that run may be lifted at all.
 *
 * The same answer in every game whose columns declare what may be taken from
 * them, which is all of them but Klondike — its tableau is deliberately laxer
 * than its own grab rule and hands back the stack regardless.
 *
 * @param view The board to read.
 * @returns The card ids the drag carries, bottom-first, or empty when the card
 *   cannot be picked up.
 */
export function stackFromCard(
  view: TableView,
): (cardId: string) => readonly string[] {
  return (cardId) => {
    const pile = view.getPileContainingCard(cardId);
    const card = view.getCardById(cardId);
    const zone = pile ? view.zoneFor(pile.id) : undefined;
    if (!pile || !card || !zone || !canGrab(zone.grab, card, pile)) {
      return [];
    }

    const cards = pile.getCards();
    const index = cards.indexOf(card);
    return index === -1 ? [] : cards.slice(index).map((held) => held.id);
  };
}
