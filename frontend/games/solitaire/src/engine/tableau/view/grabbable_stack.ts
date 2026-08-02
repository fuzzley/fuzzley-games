import { canGrab } from "../zone";
import { TableView } from "./table_view";

/**
 * The cards a drag of the given card picks up: it and everything resting on it,
 * but only when the zone holding it says that run may be lifted at all.
 *
 * The same answer in every game, including the lax ones. Klondike's columns
 * give up any face-up card along with whatever is stacked on it, ordered or
 * not, and this returns exactly that — `canGrab` asks the zone rather than
 * imposing a rule of its own, so a permissive grab rule stays permissive.
 * Klondike kept a hand-rolled copy of this for a while on the belief that it
 * could not, which cost it the one thing the copy left out: a face-down card is
 * refused here rather than handed back as the bottom of a stack.
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
