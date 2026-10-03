import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { pullFirstCard } from "../common/pull_cards";
import { DIAL } from "./grandfathers_clock_rules";

/** How many cards each column is dealt. */
export const CARDS_PER_COLUMN = 5;

/**
 * Lays each hour's starting card on its foundation, then deals the other
 * forty face up into the columns, in rows.
 *
 * @param deck The cards to deal, which this drains.
 * @param foundationAt Returns the foundation at an hour.
 */
export function dealGrandfathersClockLayout(
  deck: PlayingCard[],
  foundationAt: (hour: number) => CardPile<PlayingCard>,
  tableaus: readonly CardPile<PlayingCard>[],
): void {
  for (const { hour, start } of DIAL) {
    const card = pullFirstCard(
      deck,
      (candidate) =>
        candidate.suit === start.suit && candidate.rank === start.rank,
    );
    if (!card) continue;
    card.faceUp = true;
    foundationAt(hour).addCard(card);
  }

  for (let row = 0; row < CARDS_PER_COLUMN; row++) {
    for (const tableau of tableaus) {
      const card = deck.pop();
      if (!card) return;
      card.faceUp = true;
      tableau.addCard(card);
    }
  }
}
