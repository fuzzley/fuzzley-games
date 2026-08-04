import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { CardTransfer } from "@/engine/tableau/move";

/**
 * Deals a fixed number of cards to each column, then one to each cell.
 *
 * The opening of every all-face-up cell game. Eight Off and Seahaven had
 * character-for-character identical copies of this, including the comment,
 * differing only in how many cards a column gets.
 *
 * Every card goes down face up, so there is nothing to turn over later and no
 * bonus for doing so — the player can see the whole position from the first
 * move, and the game is entirely one of planning.
 *
 * Short decks are dealt round-robin rather than column-by-column, so a deck too
 * small to fill the tableau still spreads across every column instead of
 * loading the first few and leaving the rest bare.
 *
 * @param deck The cards to deal, which this drains.
 * @param tableaus The columns to deal onto.
 * @param cells The cells the leftover cards go into.
 * @param cardsPerColumn How many cards each column is dealt.
 */
export function dealColumnsThenCells(
  deck: PlayingCard[],
  tableaus: readonly CardPile<PlayingCard>[],
  cells: readonly CardPile<PlayingCard>[],
  cardsPerColumn: number,
): void {
  if (tableaus.length === 0) return;

  const toColumns = Math.min(deck.length, tableaus.length * cardsPerColumn);
  for (let dealt = 0; dealt < toColumns; dealt++) {
    const card = deck.pop();
    if (!card) break;
    card.faceUp = true;
    tableaus[dealt % tableaus.length].addCard(card);
  }

  // One card per cell, and no more: a cell's capacity is declared on its zone
  // and enforced by the move rules, but CardPile.addCard takes whatever it is
  // given. Dealing straight into a pile bypasses the rules, so the limit has to
  // be honoured here as well as declared there.
  for (const cell of cells) {
    const card = deck.pop();
    if (!card) break;
    card.faceUp = true;
    cell.addCard(card);
  }
}

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
