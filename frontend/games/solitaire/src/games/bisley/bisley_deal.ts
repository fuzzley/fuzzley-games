import { Deal } from "@/engine/tableau/deal";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { ALL_SUITS, PlayingCard, Rank } from "@/engine/core/card/playing_card";

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
 * @param aceFoundations One per suit, in {@link ALL_SUITS} order.
 */
export function dealBisleyLayout(
  deal: Deal,
  aceFoundations: readonly ReadonlyCardPile<PlayingCard>[],
  tableaus: readonly ReadonlyCardPile<PlayingCard>[],
): void {
  for (const ace of deal.pull((card) => card.rank === Rank.ACE)) {
    const foundation = aceFoundations[ALL_SUITS.indexOf(ace.suit)];
    if (foundation) deal.place(ace, foundation, true);
  }

  for (let row = 0; row < LONG_COLUMN_SIZE; row++) {
    for (const [index, tableau] of tableaus.entries()) {
      const size =
        index < SHORT_COLUMN_COUNT ? SHORT_COLUMN_SIZE : LONG_COLUMN_SIZE;
      if (row >= size) continue;
      if (!deal.dealTo(tableau, true)) return;
    }
  }
}
