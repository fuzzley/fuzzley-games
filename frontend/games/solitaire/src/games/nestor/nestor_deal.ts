import { Deal } from "@/engine/tableau/deal";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/** How many cards each column is dealt. */
export const CARDS_PER_COLUMN = 6;

/**
 * Deals six face-up cards to each column, in rows, so that no column holds two
 * cards of a rank, then one to each reserve.
 */
export function dealNestorLayout(
  deal: Deal,
  tableaus: readonly ReadonlyCardPile<PlayingCard>[],
  reserves: readonly ReadonlyCardPile<PlayingCard>[],
): void {
  for (let row = 0; row < CARDS_PER_COLUMN; row++) {
    for (const tableau of tableaus) {
      const card = nextCardFor(deal, tableau);
      if (!card) return;
      deal.place(card, tableau, true);
    }
  }
  deal.dealEach(reserves, true);
}

/**
 * Takes the next card whose rank the column does not already hold, sending
 * each card it passes over to the bottom of the deck, as the deal is made by
 * hand.
 *
 * Near the end of the deal every card left may repeat a rank in the column;
 * rather than search forever, it then gives up and takes the next card.
 */
function nextCardFor(
  deal: Deal,
  column: ReadonlyCardPile<PlayingCard>,
): PlayingCard | undefined {
  const ranks = new Set(column.getCards().map((card) => card.rank));
  // Each pass moves one card from the top to the bottom, so after as many
  // passes as there are cards the deck is back in its original order.
  for (let passes = deal.remaining; passes > 0; passes--) {
    const card = deal.draw();
    if (!card) return undefined;
    if (!ranks.has(card.rank)) return card;
    deal.putUnder(card);
  }
  return deal.draw();
}
