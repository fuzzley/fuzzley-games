import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank } from "@/engine/core/card/playing_card";
import { pullCards } from "../common/pull_cards";

/** How many cards each fan is dealt. */
export const CARDS_PER_FAN = 3;

/**
 * Deals the cards face up in threes, fan by fan, until they run out, which
 * leaves the last fan short and any after it empty.
 *
 * @param cards The cards to deal, drained from the end.
 */
export function dealFans(
  cards: PlayingCard[],
  fans: readonly CardPile<PlayingCard>[],
): void {
  for (const fan of fans) {
    for (let dealt = 0; dealt < CARDS_PER_FAN; dealt++) {
      const card = cards.pop();
      if (!card) return;
      card.faceUp = true;
      fan.addCard(card);
    }
  }
}

/**
 * Deals a board: the Aces to the foundations first if the variant says so,
 * then everything else into the fans.
 *
 * @param deck The cards to deal, which this drains.
 */
export function dealLaBelleLucieLayout(
  deck: PlayingCard[],
  foundations: readonly CardPile<PlayingCard>[],
  fans: readonly CardPile<PlayingCard>[],
  acesStartOnFoundations: boolean,
): void {
  if (acesStartOnFoundations) {
    const aces = pullCards(deck, (card) => card.rank === Rank.ACE);
    for (const [index, ace] of aces.entries()) {
      ace.faceUp = true;
      foundations[index]?.addCard(ace);
    }
  }
  dealFans(deck, fans);
}
