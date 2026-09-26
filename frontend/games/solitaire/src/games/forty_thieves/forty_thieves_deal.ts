import { CardPile } from "@/engine/core/card/card_pile";
import { DeckSpec } from "@/engine/core/card/deck";
import {
  ALL_RANKS,
  ALL_SUITS,
  PlayingCard,
} from "@/engine/core/card/playing_card";
import {
  FortyThievesVariant,
  fortyThievesBuriedPerColumn,
  fortyThievesCardsPerColumn,
} from "./forty_thieves_rules";

/** Two full decks: 104 cards, with two of every face. */
export const FORTY_THIEVES_TWO_DECKS: DeckSpec = {
  suits: ALL_SUITS,
  ranks: ALL_RANKS,
  copies: 2,
};

/**
 * Deals the opening for a variant, burying as many cards of each column as it
 * says, and puts the rest face down on the stock.
 *
 * @param deck The cards to deal, which this drains.
 */
export function dealFortyThievesLayout(
  deck: PlayingCard[],
  tableaus: readonly CardPile<PlayingCard>[],
  stock: CardPile<PlayingCard>,
  variant: FortyThievesVariant,
): void {
  if (tableaus.length === 0) return;

  const buried = fortyThievesBuriedPerColumn(variant);
  const perColumn = fortyThievesCardsPerColumn(variant);
  for (const tableau of tableaus) {
    for (let dealt = 0; dealt < perColumn; dealt++) {
      const card = deck.pop();
      if (!card) return;
      card.faceUp = dealt >= buried;
      tableau.addCard(card);
    }
  }

  while (deck.length > 0) {
    const card = deck.pop();
    if (!card) break;
    card.faceUp = false;
    stock.addCard(card);
  }
}
