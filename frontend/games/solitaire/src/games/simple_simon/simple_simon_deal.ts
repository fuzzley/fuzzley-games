import { Deal } from "@/engine/tableau/deal";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/**
 * Deals `deck` face up, giving each column as many cards as `cardsPerColumn`
 * says.
 *
 * @param cardsPerColumn How many cards each column is dealt, left to right.
 */
export function dealSimpleSimonLayout(
  deal: Deal,
  tableaus: readonly ReadonlyCardPile<PlayingCard>[],
  cardsPerColumn: readonly number[],
): void {
  for (const [column, tableau] of tableaus.entries()) {
    const count = cardsPerColumn[column] ?? 0;
    for (let dealt = 0; dealt < count; dealt++) {
      if (!deal.dealTo(tableau, true)) return;
    }
  }
}
