import { Deal } from "@/engine/tableau/deal";
import { CardPile } from "@/engine/core/card/card_pile";
import { ALL_RANKS, PlayingCard } from "@/engine/core/card/playing_card";
import { CalculationVariant } from "./calculation_rules";

/**
 * Deals a board for a variant: Calculation starts each foundation with the
 * first Ace, Two, Three and Four the deal reaches, in any suit, and Sir Tommy
 * starts none. Everything else goes face down to the stock.
 *
 * @param foundations In order of their interval, one to four.
 */
export function dealCalculationLayout(
  variant: CalculationVariant,
  deal: Deal,
  foundations: readonly CardPile<PlayingCard>[],
  stock: CardPile<PlayingCard>,
): void {
  if (variant === CalculationVariant.CALCULATION) {
    // The foundation at index `i` starts on the rank `i` above the Ace.
    for (const [index, foundation] of foundations.entries()) {
      const rank = ALL_RANKS[index];
      const card = deal.pullFirst((candidate) => candidate.rank === rank);
      if (card) deal.place(card, foundation, true);
    }
  }

  deal.dealRest(stock, false);
}
