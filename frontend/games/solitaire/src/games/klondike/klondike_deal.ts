import { Deal } from "@/engine/tableau/dealing/deal";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import {
  ALL_RANKS,
  ALL_SUITS,
  PlayingCard,
  Rank,
  Suit,
} from "@/engine/core/card/playing_card";
import { itemAt } from "@/engine/core/common/item_at";

/**
 * The card ranks loaded onto the foundations by an almost-win deal: everything
 * below the King, so a single move per suit finishes the game.
 */
const BELOW_KING: readonly Rank[] = ALL_RANKS.filter(
  (rank) => rank !== Rank.KING,
);

/**
 * Deals the Klondike opening: column i receives i + 1 cards with only its top
 * card face up, and the rest go face down onto the stock.
 *
 * @param allFaceUp Whether every card in the columns is face up, as in
 *   Whitehead; the stock is face down either way.
 */
export function dealKlondikeLayout(
  deal: Deal,
  tableaus: readonly ReadonlyCardPile<PlayingCard>[],
  stock: ReadonlyCardPile<PlayingCard>,
  allFaceUp = false,
): void {
  for (const [tableauIndex, tableau] of tableaus.entries()) {
    for (let cardIndex = 0; cardIndex <= tableauIndex; cardIndex++) {
      deal.dealTo(tableau, allFaceUp || cardIndex === tableauIndex);
    }
  }
  deal.dealRest(stock, false);
}

/**
 * Deals an almost-won board for verification: Ace to Queen of each suit on the
 * foundations, and each King face up on a column of its own.
 */
export function dealKlondikeAlmostWin(
  deal: Deal,
  foundations: readonly ReadonlyCardPile<PlayingCard>[],
  tableaus: readonly ReadonlyCardPile<PlayingCard>[],
): void {
  const cards = deal.drawAll();
  const placeFaceUp = (
    suit: Suit,
    rank: Rank,
    pile: ReadonlyCardPile<PlayingCard>,
  ) => {
    const card = cards.find(
      (candidate) => candidate.suit === suit && candidate.rank === rank,
    );
    if (card) deal.place(card, pile, true);
  };

  // Foundations and tableaus are both seeded in suit order, so each suit's King
  // waits on the tableau in the same position as its own foundation.
  ALL_SUITS.forEach((suit, suitIndex) => {
    for (const rank of BELOW_KING) {
      placeFaceUp(suit, rank, itemAt(foundations, suitIndex));
    }
    placeFaceUp(suit, Rank.KING, itemAt(tableaus, suitIndex));
  });
}
