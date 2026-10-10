import { Deal } from "@/engine/tableau/dealing/deal";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { DeckSpec } from "@/engine/core/card/deck";
import {
  ALL_RANKS,
  ALL_SUITS,
  PlayingCard,
  Rank,
} from "@/engine/core/card/playing_card";
import { itemAt } from "@/engine/core/common/item_at";
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
 */
export function dealFortyThievesLayout(
  deal: Deal,
  foundations: readonly ReadonlyCardPile<PlayingCard>[],
  tableaus: readonly ReadonlyCardPile<PlayingCard>[],
  stock: ReadonlyCardPile<PlayingCard>,
  variant: FortyThievesVariant,
): void {
  if (tableaus.length === 0) return;

  if (fortyThievesAcesStartOnFoundations(variant)) {
    dealAcesToFoundations(deal, foundations);
  }

  const buried = fortyThievesBuriedPerColumn(variant);
  const perColumn = fortyThievesCardsPerColumn(variant);
  for (const tableau of tableaus) {
    for (let dealt = 0; dealt < perColumn; dealt++) {
      if (!deal.dealTo(tableau, dealt >= buried)) return;
    }
  }
  deal.dealRest(stock, false);
}

/**
 * Takes every Ace out of the deck and lays one face up on each foundation in
 * turn, as many as there are foundations to take them.
 */
function dealAcesToFoundations(
  deal: Deal,
  foundations: readonly ReadonlyCardPile<PlayingCard>[],
): void {
  const aces = deal.pull((card) => card.rank === Rank.ACE);
  aces.slice(0, foundations.length).forEach((ace, index) => {
    deal.place(ace, itemAt(foundations, index), true);
  });
  // Any Ace beyond the foundations goes back to be dealt as usual.
  deal.putBack(aces.slice(foundations.length));
}
