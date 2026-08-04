import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { CardTransfer } from "@/engine/tableau/move";

/**
 * Deals one card face up from the stock onto each of the given columns.
 *
 * The other kind of stock: rather than turning cards into a waste for the
 * player to pick from, it pushes a card onto every column at once and the
 * player lives with where they land. Spider deals ten this way, Spiderette and
 * Easthaven seven, and Scorpion empties its three-card stock onto the first
 * three columns — the same action over a different set of columns, which is why
 * the columns are a parameter rather than "all of them".
 *
 * Says nothing about *whether* the stock may deal. That rule is where these
 * games genuinely disagree — Spider refuses while any column is empty, Scorpion
 * has no such restriction, Spiderette cannot afford one because its stock does
 * not divide evenly by its columns — so each game states it for itself.
 *
 * @param stock The face-down pile to deal from.
 * @param columns The columns to deal onto, one card each, in order.
 * @returns One transfer per card dealt, in the order they were dealt, for the
 *   caller to record as a single action.
 */
export function dealRowFromStock(
  stock: CardPile<PlayingCard>,
  columns: readonly CardPile<PlayingCard>[],
): CardTransfer[] {
  const transfers: CardTransfer[] = [];
  for (const column of columns) {
    const card = stock.topCard;
    // A stock with fewer cards than columns deals as far as it reaches, which
    // is the last deal of a game whose stock does not divide evenly.
    if (!card) break;
    stock.removeCard(card);
    card.faceUp = true;
    column.addCard(card);
    transfers.push({
      cardIds: [card.id],
      fromPileId: stock.id,
      toPileId: column.id,
      faceUpBefore: false,
    });
  }
  return transfers;
}
