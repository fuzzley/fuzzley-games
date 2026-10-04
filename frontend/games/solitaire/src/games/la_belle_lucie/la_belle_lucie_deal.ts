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
  for (const [fan, fanCards] of fanLayout(cards, fans)) {
    for (const card of fanCards) {
      card.faceUp = true;
      fan.addCard(card);
    }
    cards.length -= fanCards.length;
  }
}

/**
 * Returns what each fan holds once the cards are dealt in threes, fan by fan,
 * from the end of the list, with an entry for every fan, empty or not.
 */
export function fanLayout(
  cards: readonly PlayingCard[],
  fans: readonly CardPile<PlayingCard>[],
): Map<CardPile<PlayingCard>, PlayingCard[]> {
  const remaining = [...cards];
  return new Map(
    fans.map((fan) => [
      fan,
      remaining.splice(Math.max(0, remaining.length - CARDS_PER_FAN)).reverse(),
    ]),
  );
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
