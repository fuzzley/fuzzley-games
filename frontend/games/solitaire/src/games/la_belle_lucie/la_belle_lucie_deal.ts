import { Deal } from "@/engine/tableau/deal";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank } from "@/engine/core/card/playing_card";

/** How many cards each fan is dealt. */
export const CARDS_PER_FAN = 3;

/**
 * Deals the cards face up in threes, fan by fan, until they run out, which
 * leaves the last fan short and any after it empty.
 *
 */
export function dealFans(
  deal: Deal,
  fans: readonly ReadonlyCardPile<PlayingCard>[],
): void {
  for (const [fan, cards] of fanLayout(deal.drawAll(), fans)) {
    for (const card of cards) deal.place(card, fan, true);
  }
}

/**
 * Returns what each fan holds once the cards are dealt in threes, fan by fan,
 * from the end of the list, with an entry for every fan, empty or not.
 */
export function fanLayout(
  cards: readonly PlayingCard[],
  fans: readonly ReadonlyCardPile<PlayingCard>[],
): Map<ReadonlyCardPile<PlayingCard>, PlayingCard[]> {
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
 */
export function dealLaBelleLucieLayout(
  deal: Deal,
  foundations: readonly ReadonlyCardPile<PlayingCard>[],
  fans: readonly ReadonlyCardPile<PlayingCard>[],
  acesStartOnFoundations: boolean,
): void {
  if (acesStartOnFoundations) {
    const aces = deal.pull((card) => card.rank === Rank.ACE);
    for (const [index, ace] of aces.entries()) {
      const foundation = foundations[index];
      if (foundation) deal.place(ace, foundation, true);
    }
  }
  dealFans(deal, fans);
}
