import { grabbedStack } from "../rules/grab";
import { TableView } from "./table_view";

/**
 * Returns a function listing the cards a drag of a card picks up: it and
 * everything resting on it, bottom first, or none if its zone will not let go.
 */
export function stackFromCard(
  view: TableView,
): (cardId: string) => readonly string[] {
  return (cardId) => {
    const pile = view.getPileContainingCard(cardId);
    const card = view.getCardById(cardId);
    const zone = pile ? view.zoneFor(pile.id) : undefined;
    if (!pile || !card || !zone) return [];

    const stack = grabbedStack(zone.grab, card, pile, view.board);
    return stack ? stack.map((held) => held.id) : [];
  };
}
