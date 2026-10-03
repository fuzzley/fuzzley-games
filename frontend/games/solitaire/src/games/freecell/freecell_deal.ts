import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank } from "@/engine/core/card/playing_card";
import { DeckSource } from "@/engine/tableau/deck_source";
import { itemAt } from "@/engine/core/common/item_at";
import { pullCards } from "@/games/common/pull_cards";

/** Returns whether a card is one Challenge FreeCell deals first. */
function isAceOrTwo(card: PlayingCard): boolean {
  return card.rank === Rank.ACE || card.rank === Rank.TWO;
}

/**
 * Deals `deck` face up across the columns, one card to each in turn, so the
 * first four get seven cards and the rest six.
 *
 * @param deck The cards to deal, which this drains.
 * @param buryAcesAndTwos Whether to deal the Aces and Twos first, one to each
 *   column, so they sit at the bottom, as Challenge FreeCell does.
 */
export function dealFreeCellLayout(
  deck: PlayingCard[],
  tableaus: readonly CardPile<PlayingCard>[],
  buryAcesAndTwos = false,
): void {
  if (tableaus.length === 0) return;

  if (buryAcesAndTwos) {
    // Back on top of the deck, in the order they were met, so they are dealt
    // before anything else.
    deck.push(...pullCards(deck, isAceOrTwo).reverse());
  }

  let column = 0;
  while (deck.length > 0) {
    const card = deck.pop();
    if (!card) break;
    card.faceUp = true;
    itemAt(tableaus, column).addCard(card);
    column = (column + 1) % tableaus.length;
  }
}

/**
 * Deals a board one move from being won: every suit up to its highest card on
 * the foundations, and the last card of each waiting on a column.
 *
 * @param deck The cards to deal from, which this registers rather than drains.
 */
export function dealFreeCellAlmostWin(
  deck: DeckSource,
  foundations: readonly CardPile<PlayingCard>[],
  tableaus: readonly CardPile<PlayingCard>[],
): void {
  const cards = deck.register();
  for (const card of cards) {
    card.faceUp = true;
  }

  const bySuit = new Map<number, PlayingCard[]>();
  for (const card of cards) {
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
      foundation.addCard(card);
    }
    const last = ordered[ordered.length - 1];
    if (last) tableau.addCard(last);
    suitIndex++;
  }
}
