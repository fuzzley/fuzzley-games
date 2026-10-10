import { Deal } from "@/engine/tableau/dealing/deal";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { DeckSpec } from "@/engine/core/card/deck";
import {
  ALL_RANKS,
  ALL_SUITS,
  PlayingCard,
  Suit,
} from "@/engine/core/card/playing_card";
import { itemAt } from "@/engine/core/common/item_at";

/** Two full decks: 104 cards, with two of every face. */
export const SPIDER_TWO_DECKS: DeckSpec = {
  suits: ALL_SUITS,
  ranks: ALL_RANKS,
  copies: 2,
};

/** One suit, eight times over: the easy Spider variant, still 104 cards. */
export const SPIDER_ONE_SUIT: DeckSpec = {
  suits: [Suit.SPADE],
  ranks: ALL_RANKS,
  copies: 8,
};

/** Says how many suits a Spider game is played with. */
export type SpiderSuitCount = 1 | 2 | 4;

/** The suits used for each variant, in the order they are dealt. */
const SUITS_BY_COUNT: Record<SpiderSuitCount, readonly Suit[]> = {
  1: [Suit.SPADE],
  2: [Suit.SPADE, Suit.HEART],
  4: ALL_SUITS,
};

/**
 * Returns the 104-card deck for a Spider game of `suitCount` suits, with more
 * copies of each suit when there are fewer.
 */
export function spiderDeck(suitCount: SpiderSuitCount): DeckSpec {
  const suits = SUITS_BY_COUNT[suitCount];
  return { suits, ranks: ALL_RANKS, copies: 8 / suits.length };
}

/** How many cards the opening layout puts on the board. */
export const OPENING_CARD_COUNT = 54;

/**
 * Deals the Spider opening layout: 54 cards across the columns, only the top of
 * each face up, and everything left over face-down onto the stock.
 */
export function dealSpiderLayout(
  deal: Deal,
  tableaus: readonly ReadonlyCardPile<PlayingCard>[],
  stock: ReadonlyCardPile<PlayingCard>,
): void {
  if (tableaus.length === 0) return;

  const toDeal = Math.min(OPENING_CARD_COUNT, deal.remaining);
  for (let dealt = 0; dealt < toDeal; dealt++) {
    deal.dealTo(itemAt(tableaus, dealt % tableaus.length), false);
  }
  for (const tableau of tableaus) {
    const top = tableau.topCard;
    if (top) top.faceUp = true;
  }
  deal.dealRest(stock, false);
}
