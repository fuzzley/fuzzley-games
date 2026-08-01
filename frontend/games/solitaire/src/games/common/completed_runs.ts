import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank } from "@/engine/core/card/playing_card";
import { CardTransfer } from "@/engine/tableau/move";
import { isSameSuitRun } from "@/engine/tableau/rules";

/** How many cards a complete run holds: King down to Ace. */
export const RUN_LENGTH = 13;

/**
 * Where a completed King-to-Ace run starts in a column, or -1 for a column that
 * has not finished one.
 *
 * Only the top {@link RUN_LENGTH} cards are considered, so a run that a later
 * card has been stacked on top of is not collected. That is deliberate rather
 * than an oversight, and it matters in Scorpion: its grab rule lets a player
 * lift an Ace with cards already resting on it and drop the pair onto the Two,
 * finishing a run that is not at the top of its column. Leaving it in place is
 * how the game is conventionally played, and it corrects itself — the run is
 * collected the moment the covering card moves away.
 *
 * @param cards A column's cards, bottom-first.
 */
export function completedRunStart(cards: readonly PlayingCard[]): number {
  if (cards.length < RUN_LENGTH) return -1;

  const start = cards.length - RUN_LENGTH;
  const run = cards.slice(start);
  if (run[0].rank !== Rank.KING || run[run.length - 1].rank !== Rank.ACE) {
    return -1;
  }
  for (let index = 0; index < run.length - 1; index++) {
    if (!run[index].faceUp) return -1;
    if (!isSameSuitRun(run[index], run[index + 1])) return -1;
  }
  return start;
}

/**
 * Turns the pile's newly exposed top card face up.
 *
 * Deliberately says nothing about which piles deserve this: a foundation and a
 * stock both have top cards and neither should be turned over by a move that
 * happened to leave one exposed. The caller checks the role, because only the
 * caller knows which of its roles is a column.
 *
 * @returns The card turned over, or undefined if none was.
 */
export function flipExposedTop(
  pile: CardPile<PlayingCard>,
): PlayingCard | undefined {
  const top = pile.topCard;
  if (!top || top.faceUp) return undefined;
  top.faceUp = true;
  return top;
}

/**
 * Sends every completed King-to-Ace run off to a foundation.
 *
 * Shared by Spider and Scorpion, which differ in almost everything else — how
 * many decks, how many columns, what a column accepts, what may be lifted from
 * one — and agree exactly here. Every column is rescanned rather than only the
 * ones a move touched, because one move can finish two runs, and because a run
 * left buried by an earlier move (see {@link completedRunStart}) becomes
 * collectable as soon as anything uncovers it.
 *
 * Returns what it moved and what it turned over rather than recording anything
 * itself, so the caller can fold both into the action that caused them: a
 * completed run is a consequence of a move, not a move of its own, and one undo
 * has to take the whole thing back.
 *
 * @param tableaus The columns to scan.
 * @param foundations The piles a completed run may go to.
 */
export function collectCompletedRuns(
  tableaus: readonly CardPile<PlayingCard>[],
  foundations: readonly CardPile<PlayingCard>[],
): { transfers: CardTransfer[]; flippedCardIds: string[] } {
  const transfers: CardTransfer[] = [];
  const flippedCardIds: string[] = [];

  for (const tableau of tableaus) {
    const start = completedRunStart(tableau.getCards());
    if (start === -1) continue;

    const foundation = foundations.find((pile) => pile.isEmpty);
    if (!foundation) continue;

    const run = tableau.getCards().slice(start, start + RUN_LENGTH);
    for (const card of run) {
      tableau.removeCard(card);
      foundation.addCard(card);
    }
    transfers.push({
      cardIds: run.map((card) => card.id),
      fromPileId: tableau.id,
      toPileId: foundation.id,
      faceUpBefore: true,
    });

    // Taking a run off can expose a face-down card underneath it.
    const flipped = flipExposedTop(tableau);
    if (flipped) flippedCardIds.push(flipped.id);
  }

  return { transfers, flippedCardIds };
}
