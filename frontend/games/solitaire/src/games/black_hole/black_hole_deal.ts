import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank, Suit } from "@/engine/core/card/playing_card";
import { pullFirstCard } from "../common/pull_cards";
import { BlackHoleVariant } from "./black_hole_rules";

/** How many cards each fan or column is dealt, per variant. */
export const CARDS_PER_PILE: Readonly<Record<BlackHoleVariant, number>> = {
  [BlackHoleVariant.BLACK_HOLE]: 3,
  [BlackHoleVariant.ALL_IN_A_ROW]: 4,
};

/**
 * Deals a board for a variant: Black Hole first drops the Ace of Spades into
 * the hole. Then the cards go face up, fan by fan.
 *
 * @param deck The cards to deal, which this drains.
 */
export function dealBlackHoleLayout(
  variant: BlackHoleVariant,
  deck: PlayingCard[],
  foundation: CardPile<PlayingCard>,
  tableaus: readonly CardPile<PlayingCard>[],
): void {
  if (variant === BlackHoleVariant.BLACK_HOLE) {
    const ace = pullFirstCard(
      deck,
      (card) => card.suit === Suit.SPADE && card.rank === Rank.ACE,
    );
    if (ace) {
      ace.faceUp = true;
      foundation.addCard(ace);
    }
  }

  for (const tableau of tableaus) {
    for (let dealt = 0; dealt < CARDS_PER_PILE[variant]; dealt++) {
      const card = deck.pop();
      if (!card) return;
      card.faceUp = true;
      tableau.addCard(card);
    }
  }
}
