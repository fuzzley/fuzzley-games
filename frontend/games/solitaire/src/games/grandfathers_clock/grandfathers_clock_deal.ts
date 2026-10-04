import { Deal } from "@/engine/tableau/deal";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { DIAL } from "./grandfathers_clock_rules";

/** How many cards each column is dealt. */
export const CARDS_PER_COLUMN = 5;

/**
 * Lays each hour's starting card on its foundation, then deals the other
 * forty face up into the columns, in rows.
 *
 * @param foundationAt Returns the foundation at an hour.
 */
export function dealGrandfathersClockLayout(
  deal: Deal,
  foundationAt: (hour: number) => ReadonlyCardPile<PlayingCard>,
  tableaus: readonly ReadonlyCardPile<PlayingCard>[],
): void {
  for (const { hour, start } of DIAL) {
    const card = deal.pullFirst(
      (candidate) =>
        candidate.suit === start.suit && candidate.rank === start.rank,
    );
    if (card) deal.place(card, foundationAt(hour), true);
  }

  for (let row = 0; row < CARDS_PER_COLUMN; row++) {
    if (!deal.dealEach(tableaus, true)) return;
  }
}
