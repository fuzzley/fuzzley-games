import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank } from "@/engine/core/card/playing_card";
import { pullCards } from "../common/pull_cards";
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
    // Ranks are removed as they are found, so only the first of each is.
    const wanted = new Set<Rank>(foundations.map((_, index) => index));
    for (const card of pullCards(deck, (card) => wanted.delete(card.rank))) {
      card.faceUp = true;
      foundations[card.rank]?.addCard(card);
    }
  }

  let card = deck.pop();
  while (card) {
    card.faceUp = false;
    stock.addCard(card);
    card = deck.pop();
  }
}
