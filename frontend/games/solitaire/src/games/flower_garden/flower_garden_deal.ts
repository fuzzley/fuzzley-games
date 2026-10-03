import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";

/** How many cards each bed is dealt. */
export const CARDS_PER_BED = 6;

/**
 * Deals six face-up cards to each bed, in rows, then one to each place in the
 * bouquet.
 *
 * @param deck The cards to deal, which this drains.
 */
export function dealFlowerGardenLayout(
  deck: PlayingCard[],
  beds: readonly CardPile<PlayingCard>[],
  bouquet: readonly CardPile<PlayingCard>[],
): void {
  for (let row = 0; row < CARDS_PER_BED; row++) {
    for (const bed of beds) {
      const card = deck.pop();
      if (!card) return;
      card.faceUp = true;
      bed.addCard(card);
    }
  }

  for (const place of bouquet) {
    const card = deck.pop();
    if (!card) return;
    card.faceUp = true;
    place.addCard(card);
  }
}
