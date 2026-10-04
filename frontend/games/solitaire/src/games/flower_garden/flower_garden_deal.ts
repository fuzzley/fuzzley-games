import { Deal } from "@/engine/tableau/deal";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/** How many cards each bed is dealt. */
export const CARDS_PER_BED = 6;

/**
 * Deals six face-up cards to each bed, in rows, then one to each place in the
 * bouquet.
 */
export function dealFlowerGardenLayout(
  deal: Deal,
  beds: readonly ReadonlyCardPile<PlayingCard>[],
  bouquet: readonly ReadonlyCardPile<PlayingCard>[],
): void {
  for (let row = 0; row < CARDS_PER_BED; row++) {
    if (!deal.dealEach(beds, true)) return;
  }
  deal.dealEach(bouquet, true);
}
