import { Deal } from "@/engine/tableau/dealing/deal";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { sinkKings } from "../common/sink_kings";

/** How many cards each column is dealt: four across thirteen columns is 52. */
export const CARDS_PER_COLUMN = 4;

/**
 * Deals `deck` four to a column, face up, with every King sunk to the bottom of
 * the column it landed in.
 *
 * A King can never move, so one dealt on top would bury the cards beneath it
 * for the whole game.
 */
export function dealBakersDozenLayout(
  deal: Deal,
  tableaus: readonly ReadonlyCardPile<PlayingCard>[],
): void {
  for (const tableau of tableaus) {
    const column: PlayingCard[] = [];
    for (let dealt = 0; dealt < CARDS_PER_COLUMN; dealt++) {
      const card = deal.draw();
      if (!card) break;
      column.push(card);
    }
    for (const card of sinkKings(column)) {
      deal.place(card, tableau, true);
    }
  }
}
