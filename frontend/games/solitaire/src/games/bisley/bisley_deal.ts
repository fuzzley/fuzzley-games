import { CardPile } from "@/engine/core/card/card_pile";
import { ALL_SUITS, PlayingCard, Rank } from "@/engine/core/card/playing_card";
import { pullCards } from "../common/pull_cards";

/** How many columns sit under the Aces and are dealt one card short. */
export const SHORT_COLUMN_COUNT = ALL_SUITS.length;

/** How many cards a column under an Ace is dealt. */
export const SHORT_COLUMN_SIZE = 3;

/** How many cards every other column is dealt. */
export const LONG_COLUMN_SIZE = 4;

/**
 * Lays each Ace on the foundation of its suit, then deals the rest face up in
 * rows: three to each of the first four columns and four to each of the others.
 *
 * @param deck The cards to deal, which this drains.
 * @param aceFoundations One per suit, in {@link ALL_SUITS} order.
 */
export function dealBisleyLayout(
  deck: PlayingCard[],
  aceFoundations: readonly CardPile<PlayingCard>[],
  tableaus: readonly CardPile<PlayingCard>[],
): void {
  for (const ace of pullCards(deck, (card) => card.rank === Rank.ACE)) {
    ace.faceUp = true;
    aceFoundations[ALL_SUITS.indexOf(ace.suit)]?.addCard(ace);
  }

  for (let row = 0; row < LONG_COLUMN_SIZE; row++) {
    for (const [index, tableau] of tableaus.entries()) {
      const size =
        index < SHORT_COLUMN_COUNT ? SHORT_COLUMN_SIZE : LONG_COLUMN_SIZE;
      if (row >= size) continue;
      const card = deck.pop();
      if (!card) return;
      card.faceUp = true;
      tableau.addCard(card);
    }
  }
}
