import { CardPile } from "@/engine/core/card/card_pile";
import { ALL_RANKS, PlayingCard } from "@/engine/core/card/playing_card";
import { pullFirstCard } from "../common/pull_cards";
import { CalculationVariant } from "./calculation_rules";

/**
 * Deals a board for a variant: Calculation starts each foundation with the
 * first Ace, Two, Three and Four the deal reaches, in any suit, and Sir Tommy
 * starts none. Everything else goes face down to the stock.
 *
 * @param deck The cards to deal, which this drains.
 * @param foundations In order of their interval, one to four.
 */
export function dealCalculationLayout(
  variant: CalculationVariant,
  deck: PlayingCard[],
  foundations: readonly CardPile<PlayingCard>[],
  stock: CardPile<PlayingCard>,
): void {
  if (variant === CalculationVariant.CALCULATION) {
    // The foundation at index `i` starts on the rank `i` above the Ace.
    for (const [index, foundation] of foundations.entries()) {
      const rank = ALL_RANKS[index];
      const card = pullFirstCard(deck, (card) => card.rank === rank);
      if (!card) continue;
      card.faceUp = true;
      foundation.addCard(card);
    }
  }

  let card = deck.pop();
  while (card) {
    card.faceUp = false;
    stock.addCard(card);
    card = deck.pop();
  }
}
