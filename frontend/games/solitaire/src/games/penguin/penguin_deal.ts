import { Deal } from "@/engine/tableau/deal";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/** How many cards a full deck deals to each column. */
export const CARDS_PER_COLUMN = 7;

/**
 * Deals the whole deck face-up to the columns, a row at a time. The first card
 * is the beak; each other card of its rank goes to the next foundation as it
 * turns up, and the card after it takes its place.
 *
 * A card of the beak's rank can be the last card in the deck, turning up only
 * after the last row is full, so the deal runs until the deck is empty rather
 * than until the columns are.
 */
export function dealPenguinLayout(
  deal: Deal,
  foundations: readonly ReadonlyCardPile<PlayingCard>[],
  tableaus: readonly ReadonlyCardPile<PlayingCard>[],
): void {
  const beak = deal.peek();
  let nextFoundation = 0;
  let nextColumn = 0;

  for (let card = deal.draw(); card; card = deal.draw()) {
    const pile =
      card !== beak && card.rank === beak?.rank
        ? foundations[nextFoundation++]
        : tableaus[nextColumn++ % tableaus.length];
    if (pile) deal.place(card, pile, true);
  }
}
