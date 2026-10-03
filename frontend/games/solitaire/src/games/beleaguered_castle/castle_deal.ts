import { CardPile } from "@/engine/core/card/card_pile";
import {
  ALL_SUITS,
  PlayingCard,
  Rank,
  rankAbove,
} from "@/engine/core/card/playing_card";
import { pullCards } from "../common/pull_cards";
import { CastleVariantRules } from "./castle_rules";

/**
 * Deals a board under a variant's rules: the Aces to the foundations first
 * where the variant says so, then the rest face up, round the rows in turn
 * until the deck is out.
 *
 * Citadel sends a card the foundations would take straight there instead, and
 * the next card goes to that row.
 *
 * @param deck The cards to deal, which this drains.
 * @param foundations One per suit, in {@link ALL_SUITS} order.
 */
export function dealCastleLayout(
  rules: CastleVariantRules,
  deck: PlayingCard[],
  foundations: readonly CardPile<PlayingCard>[],
  rows: readonly CardPile<PlayingCard>[],
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
    for (const ace of pullCards(deck, (card) => card.rank === Rank.ACE)) {
      ace.faceUp = true;
      homeFor(ace)?.addCard(ace);
    }
  }

  let next = 0;
  let card = deck.pop();
  while (card) {
    card.faceUp = true;
    const home = rules.sendsHomeWhileDealing ? homeFor(card) : undefined;
    if (home) {
      home.addCard(card);
    } else if (rows.length > 0) {
      rows[next % rows.length]?.addCard(card);
      next++;
    }
    card = deck.pop();
  }
}
