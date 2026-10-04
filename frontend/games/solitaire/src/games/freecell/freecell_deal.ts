import { Deal } from "@/engine/tableau/deal";
import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank } from "@/engine/core/card/playing_card";
import { itemAt } from "@/engine/core/common/item_at";

/** Returns whether a card is one Challenge FreeCell deals first. */
function isAceOrTwo(card: PlayingCard): boolean {
  return card.rank === Rank.ACE || card.rank === Rank.TWO;
}

/**
 * Deals `deck` face up across the columns, one card to each in turn, so the
 * first four get seven cards and the rest six.
 *
 * @param buryAcesAndTwos Whether to deal the Aces and Twos first, one to each
 *   column, so they sit at the bottom, as Challenge FreeCell does.
 */
export function dealFreeCellLayout(
  deal: Deal,
  tableaus: readonly CardPile<PlayingCard>[],
  buryAcesAndTwos = false,
): void {
  if (tableaus.length === 0) return;

  if (buryAcesAndTwos) {
    // Back on top of the deck, in the order they were met, so they are dealt
    // before anything else.
    deal.putBack(deal.pull(isAceOrTwo));
  }

  let column = 0;
  while (deal.dealTo(itemAt(tableaus, column), true)) {
    column = (column + 1) % tableaus.length;
  }
}

/**
 * Deals a board one move from being won: every suit up to its highest card on
 * the foundations, and the last card of each waiting on a column.
 */
export function dealFreeCellAlmostWin(
  deal: Deal,
  foundations: readonly CardPile<PlayingCard>[],
  tableaus: readonly CardPile<PlayingCard>[],
): void {
  const bySuit = new Map<number, PlayingCard[]>();
  for (const card of deal.drawAll()) {
    const suitCards = bySuit.get(card.suit) ?? [];
    suitCards.push(card);
    bySuit.set(card.suit, suitCards);
  }

  let suitIndex = 0;
  for (const suitCards of bySuit.values()) {
    const ordered = [...suitCards].sort((a, b) => a.rank - b.rank);
    const foundation = itemAt(foundations, suitIndex % foundations.length);
    const tableau = itemAt(tableaus, suitIndex % tableaus.length);
    for (const card of ordered.slice(0, ordered.length - 1)) {
      deal.place(card, foundation, true);
    }
    const last = ordered[ordered.length - 1];
    if (last) deal.place(last, tableau, true);
    suitIndex++;
  }
}
