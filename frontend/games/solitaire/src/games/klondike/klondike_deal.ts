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
 * Deals the Klondike opening: column i receives i + 1 cards with only its top
 * card face up, and the rest go face down onto the stock.
 *
 * @param deck The cards to deal, which this drains from the end.
 * @param allFaceUp Whether every card in the columns is face up, as in
 *   Whitehead; the stock is face down either way.
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
 * Deals an almost-won board for verification: Ace to Queen of each suit on the
 * foundations, and each King face up on a column of its own.
 *
 * @param deck The cards to deal from, which this registers rather than drains.
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
