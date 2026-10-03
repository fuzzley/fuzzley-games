import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank } from "@/engine/core/card/playing_card";
import { pullFirstCard } from "../common/pull_cards";
import { sinkKings } from "../common/sink_kings";
import { BristolVariant } from "./bristol_rules";

/** How many cards each fan is dealt. */
export const CARDS_PER_FAN = 3;

/** Holds the piles a Bristol deal fills. */
export interface BristolPiles {
  readonly foundations: readonly CardPile<PlayingCard>[];
  readonly tableaus: readonly CardPile<PlayingCard>[];
  readonly reserves: readonly CardPile<PlayingCard>[];
  readonly stock: CardPile<PlayingCard>;
}

/**
 * Deals a board for a variant: Belvedere first lays the first Ace the deal
 * reaches on a foundation. Then three cards face up to each fan, with its
 * Kings sunk to the bottom, one to each reserve, and the rest face down to the
 * stock.
 *
 * @param deck The cards to deal, which this drains.
 */
export function dealBristolLayout(
  variant: BristolVariant,
  deck: PlayingCard[],
  piles: BristolPiles,
): void {
  if (variant === BristolVariant.BELVEDERE) {
    const ace = pullFirstCard(deck, (card) => card.rank === Rank.ACE);
    if (ace) {
      ace.faceUp = true;
      piles.foundations[0]?.addCard(ace);
    }
  }

  for (const tableau of piles.tableaus) {
    const fan: PlayingCard[] = [];
    for (let dealt = 0; dealt < CARDS_PER_FAN; dealt++) {
      const card = deck.pop();
      if (!card) break;
      card.faceUp = true;
      fan.push(card);
    }
    for (const card of sinkKings(fan)) {
      tableau.addCard(card);
    }
  }

  for (const reserve of piles.reserves) {
    const card = deck.pop();
    if (!card) return;
    card.faceUp = true;
    reserve.addCard(card);
  }

  let card = deck.pop();
  while (card) {
    card.faceUp = false;
    piles.stock.addCard(card);
    card = deck.pop();
  }
}
