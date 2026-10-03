import { CardPile } from "@/engine/core/card/card_pile";
import { DeckSpec } from "@/engine/core/card/deck";
import {
  ALL_RANKS,
  ALL_SUITS,
  PlayingCard,
  Rank,
} from "@/engine/core/card/playing_card";
import { itemAt } from "@/engine/core/common/item_at";
import { pullCards } from "@/games/common/pull_cards";
import {
  FortyThievesVariant,
  fortyThievesAcesStartOnFoundations,
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
 * Deals the opening for a variant: the Aces onto the foundations if it says
 * so, then the columns, burying as many cards of each as it says, and the
 * rest face down on the stock.
 *
 * @param deck The cards to deal, which this drains.
 */
export function dealFortyThievesLayout(
  deck: PlayingCard[],
  foundations: readonly CardPile<PlayingCard>[],
  tableaus: readonly CardPile<PlayingCard>[],
  stock: CardPile<PlayingCard>,
  variant: FortyThievesVariant,
): void {
  if (tableaus.length === 0) return;

  if (fortyThievesAcesStartOnFoundations(variant)) {
    dealAcesToFoundations(deck, foundations);
  }

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

/**
 * Takes every Ace out of the deck and lays one face up on each foundation in
 * turn, as many as there are foundations to take them.
 *
 * @param deck The cards to deal, which this shortens.
 */
function dealAcesToFoundations(
  deck: PlayingCard[],
  foundations: readonly CardPile<PlayingCard>[],
): void {
  const aces = pullCards(deck, (card) => card.rank === Rank.ACE);
  aces.slice(0, foundations.length).forEach((ace, index) => {
    ace.faceUp = true;
    itemAt(foundations, index).addCard(ace);
  });
  // Any Ace beyond the foundations goes back to be dealt as usual.
  deck.push(...aces.slice(foundations.length).reverse());
}
