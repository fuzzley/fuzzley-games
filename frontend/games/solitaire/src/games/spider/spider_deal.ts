import { CardPile } from "@/engine/core/card/card_pile";
import { DeckSpec } from "@/engine/core/card/deck";
import {
  ALL_RANKS,
  ALL_SUITS,
  PlayingCard,
  Suit,
} from "@/engine/core/card/playing_card";

/**
 * Two full decks: 104 cards, with two of every face.
 *
 * The first deck specification in the project that is not one standard 52, and
 * the reason the `id` / `faceKey` split exists at all — a two-deck game holds
 * two Queens of Hearts, which look alike and move separately.
 */
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

/** How many suits a Spider game is played with. */
export type SpiderSuitCount = 1 | 2 | 4;

/** The suits used for each variant, in the order they are dealt. */
const SUITS_BY_COUNT: Record<SpiderSuitCount, readonly Suit[]> = {
  1: [Suit.SPADE],
  2: [Suit.SPADE, Suit.HEART],
  4: ALL_SUITS,
};

/**
 * The deck for a Spider game of the given difficulty.
 *
 * Always 104 cards: fewer suits simply means more copies of each. One suit is
 * the gentle version, four is the standard game, and two sits between them.
 *
 * @param suitCount How many suits to play with.
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
 *
 * The first four columns get six cards and the rest five, which is what dealing
 * 54 across ten columns comes to.
 *
 * @param deck The cards to deal, which this drains.
 * @param tableaus The columns to deal onto.
 * @param stock The stock to fill with the remainder.
 */
export function dealSpiderLayout(
  deck: PlayingCard[],
  tableaus: readonly CardPile<PlayingCard>[],
  stock: CardPile<PlayingCard>,
): void {
  if (tableaus.length === 0) return;

  const toDeal = Math.min(OPENING_CARD_COUNT, deck.length);
  for (let dealt = 0; dealt < toDeal; dealt++) {
    const card = deck.pop();
    if (!card) break;
    card.faceUp = false;
    tableaus[dealt % tableaus.length].addCard(card);
  }

  for (const tableau of tableaus) {
    const top = tableau.topCard;
    if (top) top.faceUp = true;
  }

  while (deck.length > 0) {
    const card = deck.pop();
    if (!card) break;
    card.faceUp = false;
    stock.addCard(card);
  }
}
