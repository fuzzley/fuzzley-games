import { CardPile } from "@/engine/core/card/card_pile";
import { DeckSpec } from "@/engine/core/card/deck";
import {
  ALL_RANKS,
  ALL_SUITS,
  PlayingCard,
} from "@/engine/core/card/playing_card";
import {
  FortyThievesVariant,
  fortyThievesBuriedPerColumn,
  fortyThievesCardsPerColumn,
} from "./forty_thieves_rules";

/**
 * Two full decks: 104 cards, with two of every face.
 *
 * The whole family plays with these, which is where the name comes from — forty
 * cards dealt to the tableau out of a hundred and four.
 */
export const FORTY_THIEVES_TWO_DECKS: DeckSpec = {
  suits: ALL_SUITS,
  ranks: ALL_RANKS,
  copies: 2,
};

/**
 * Deals the opening layout for the given variant and puts the rest on the stock.
 *
 * Forty cards to the columns in the games that give the family its name — ten
 * columns of four — and thirty-six in Maria and Limited, which reach the same
 * total from nine columns of four and twelve of three. Everything not dealt goes
 * to the stock, so a narrower tableau simply means a longer countdown.
 *
 * How many of each column are buried varies too: none in most of the family,
 * where the whole tableau is visible from the first move, and three in Rank and
 * File, which trades that openness for its gentler alternating-colour build.
 *
 * A short injected deck simply runs out; the columns already dealt stand as they
 * are rather than the deal failing.
 *
 * @param deck The cards to deal, which this drains.
 * @param tableaus The columns to deal onto.
 * @param stock The stock to fill with the remainder.
 * @param variant Which of the openings to lay out.
 */
export function dealFortyThievesLayout(
  deck: PlayingCard[],
  tableaus: readonly CardPile<PlayingCard>[],
  stock: CardPile<PlayingCard>,
  variant: FortyThievesVariant,
): void {
  if (tableaus.length === 0) return;

  const buried = fortyThievesBuriedPerColumn(variant);
  const perColumn = fortyThievesCardsPerColumn(variant);
  for (const tableau of tableaus) {
    for (let dealt = 0; dealt < perColumn; dealt++) {
      const card = deck.pop();
      if (!card) return;
      card.faceUp = dealt >= buried;
      tableau.addCard(card);
    }
  }

  while (deck.length > 0) {
    const card = deck.pop();
    if (!card) break;
    card.faceUp = false;
    stock.addCard(card);
  }
}
