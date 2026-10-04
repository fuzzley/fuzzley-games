import { itemAt } from "@/engine/core/common/item_at";
import { Deal } from "@/engine/tableau/deal";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import {
  ALL_SUITS,
  PlayingCard,
  Rank,
  rankAbove,
} from "@/engine/core/card/playing_card";
import { CastleVariantRules } from "./castle_rules";

/**
 * Deals a board under a variant's rules: the Aces to the foundations first
 * where the variant says so, then the rest face up, round the rows in turn
 * until the deck is out.
 *
 * Citadel sends a card the foundations would take straight there instead, and
 * the next card goes to that row.
 *
 * @param foundations One per suit, in {@link ALL_SUITS} order.
 */
export function dealCastleLayout(
  rules: CastleVariantRules,
  deal: Deal,
  foundations: readonly ReadonlyCardPile<PlayingCard>[],
  rows: readonly ReadonlyCardPile<PlayingCard>[],
): void {
  /** Returns the foundation of the card's suit, if it would take the card. */
  const homeFor = (card: PlayingCard) => {
    const foundation = foundations[ALL_SUITS.indexOf(card.suit)];
    const top = foundation?.topCard;
    const fits = top
      ? card.rank === rankAbove(top.rank)
      : card.rank === Rank.ACE;
    return fits ? foundation : undefined;
  };

  if (rules.acesStartOnFoundations) {
    for (const ace of deal.pull((card) => card.rank === Rank.ACE)) {
      const home = homeFor(ace);
      if (home) deal.place(ace, home, true);
    }
  }

  let next = 0;
  for (let card = deal.draw(); card; card = deal.draw()) {
    const home = rules.sendsHomeWhileDealing ? homeFor(card) : undefined;
    if (home) {
      deal.place(card, home, true);
    } else if (rows.length > 0) {
      deal.place(card, itemAt(rows, next % rows.length), true);
      next++;
    }
  }
}
