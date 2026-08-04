import { CardPile } from "@/engine/core/card/card_pile";
import {
  ALL_RANKS,
  ALL_SUITS,
  PlayingCard,
  Rank,
} from "@/engine/core/card/playing_card";
import { DeckSource } from "@/engine/tableau/deck_source";

/**
 * The card ranks loaded onto the foundations by an almost-win deal: everything
 * below the King, so a single move per suit finishes the game.
 */
const BELOW_KING: readonly Rank[] = ALL_RANKS.filter(
  (rank) => rank !== Rank.KING,
);

/**
 * Deals `deck` into the standard Klondike opening layout: tableau column i
 * receives i + 1 cards with only its top card face-up, and every remaining card
 * goes face-down onto the stock. Consumes `deck` from the top (end).
 *
 * @param deck The cards to deal, which this drains.
 * @param tableaus The tableau piles to deal onto.
 * @param stock The stock pile to fill with the remainder.
 * @param allFaceUp Whether to show every card the columns receive rather than
 *   only the top of each. Whitehead's whole character: the same staircase with
 *   nothing hidden in it. The stock is still dealt face down either way — it is
 *   drawn from, not read.
 */
export function dealKlondikeLayout(
  deck: PlayingCard[],
  tableaus: readonly CardPile<PlayingCard>[],
  stock: CardPile<PlayingCard>,
  allFaceUp = false,
): void {
  for (let tableauIndex = 0; tableauIndex < tableaus.length; tableauIndex++) {
    for (let cardIndex = 0; cardIndex <= tableauIndex; cardIndex++) {
      const card = deck.pop();
      if (card) {
        card.faceUp = allFaceUp || cardIndex === tableauIndex;
        tableaus[tableauIndex].addCard(card);
      }
    }
  }
  while (deck.length > 0) {
    const card = deck.pop();
    if (card) {
      card.faceUp = false;
      stock.addCard(card);
    }
  }
}

/**
 * Deals an almost-won board for verification: Ace through Queen of each suit
 * are loaded face-up onto the foundations, and the four Kings are placed
 * face-up on the first four tableaus, leaving the stock and waste empty.
 *
 * Cards outside the configured deck are skipped, so an almost-win deal from a
 * partial deck simply places fewer cards.
 *
 * @param deck The cards to deal from, which this registers rather than drains.
 * @param foundations The foundation piles to fill.
 * @param tableaus The tableau piles to seed with Kings.
 */
export function dealKlondikeAlmostWin(
  deck: DeckSource,
  foundations: readonly CardPile<PlayingCard>[],
  tableaus: readonly CardPile<PlayingCard>[],
): void {
  deck.register();

  const placeFaceUp = (
    suit: (typeof ALL_SUITS)[number],
    rank: Rank,
    pile: CardPile<PlayingCard>,
  ) => {
    const card = deck.find({ suit, rank });
    if (card) {
      card.faceUp = true;
      pile.addCard(card);
    }
  };

  // Foundations and tableaus are both seeded in suit order, so each suit's King
  // waits on the tableau in the same position as its own foundation.
  ALL_SUITS.forEach((suit, suitIndex) => {
    for (const rank of BELOW_KING) {
      placeFaceUp(suit, rank, foundations[suitIndex]);
    }
    placeFaceUp(suit, Rank.KING, tableaus[suitIndex]);
  });
}
