import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank } from "@/engine/core/card/playing_card";
import { CardTransfer } from "@/engine/tableau/move";
import { Tabletop } from "@/engine/tableau/tabletop";
import { isSameSuitRun } from "@/engine/tableau/rules/adjacency";
import { itemAt } from "@/engine/core/common/item_at";

/** How many cards a complete run holds: King down to Ace. */
export const RUN_LENGTH = 13;

/**
 * Returns where a completed King-to-Ace run starts at the top of a column, or
 * -1 if there is none.
 *
 * A run with a card stacked on it, which Scorpion allows, is deliberately left
 * until that card moves away, as the game is conventionally played.
 *
 * @param cards A column's cards, bottom first.
 */
export function completedRunStart(cards: readonly PlayingCard[]): number {
  if (cards.length < RUN_LENGTH) return -1;

  const start = cards.length - RUN_LENGTH;
  const run = cards.slice(start);
  if (run[0]?.rank !== Rank.KING || run.at(-1)?.rank !== Rank.ACE) {
    return -1;
  }
  for (let index = 0; index + 1 < run.length; index++) {
    const lower = itemAt(run, index);
    if (!lower.faceUp) return -1;
    if (!isSameSuitRun(lower, itemAt(run, index + 1))) return -1;
  }
  return start;
}

/**
 * Turns the pile's top card face up and returns it, or undefined if it was
 * already face up.
 *
 * Checking that the pile is a column is the caller's job.
 */
export function flipExposedTop(
  pile: ReadonlyCardPile<PlayingCard>,
): PlayingCard | undefined {
  const top = pile.topCard;
  if (!top || top.faceUp) return undefined;
  top.faceUp = true;
  return top;
}

/**
 * Sends every completed King-to-Ace run off to a foundation, and returns what
 * it moved and turned over for the caller to record with the move behind it.
 *
 * Every column is rescanned, not just the ones a move touched, since a run
 * left covered earlier becomes collectable once anything uncovers it.
 */
export function collectCompletedRuns(
  tabletop: Tabletop,
  tableaus: readonly ReadonlyCardPile<PlayingCard>[],
  foundations: readonly ReadonlyCardPile<PlayingCard>[],
): { transfers: CardTransfer[]; flippedCardIds: string[] } {
  const transfers: CardTransfer[] = [];
  const flippedCardIds: string[] = [];

  for (const tableau of tableaus) {
    const start = completedRunStart(tableau.getCards());
    if (start === -1) continue;

    const foundation = foundations.find((pile) => pile.isEmpty);
    if (!foundation) continue;

    const run = tableau.getCards().slice(start, start + RUN_LENGTH);
    transfers.push(tabletop.relocate(run, foundation));

    // Taking a run off can expose a face-down card underneath it.
    const flipped = flipExposedTop(tableau);
    if (flipped) flippedCardIds.push(flipped.id);
  }

  return { transfers, flippedCardIds };
}
