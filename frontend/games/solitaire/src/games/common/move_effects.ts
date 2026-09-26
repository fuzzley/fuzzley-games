import { CardPile, PileRole } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { collectCompletedRuns, flipExposedTop } from "./completed_runs";

/**
 * Applies what a move does beyond relocating its cards, in the two shapes most
 * games share.
 */

/**
 * Turns over the card a move exposed, if it left a column.
 *
 * @param move The move, already applied to the piles.
 * @param columnRole The role of the piles that bury cards.
 */
export function flipOnlyEffects(
  move: ResolvedMove,
  columnRole: PileRole,
): MoveEffects {
  const flipped = flipExposedTopOfColumn(move.sourcePile, columnRole);
  return {
    scoreDelta: 0,
    flippedCardIds: flipped ? [flipped.id] : [],
  };
}

/**
 * Turns over the exposed card and sends any completed run to a foundation.
 *
 * @param move The move, already applied to the piles.
 * @param columnRole The role of the piles that bury cards.
 */
export function runCollectingEffects(
  move: ResolvedMove,
  columnRole: PileRole,
  columns: readonly CardPile<PlayingCard>[],
  foundations: readonly CardPile<PlayingCard>[],
): MoveEffects {
  const flipped = flipExposedTopOfColumn(move.sourcePile, columnRole);
  // Collected after the flip, because taking a run off can expose another card,
  // and every card this move turned over has to be recorded together for undo
  // to turn them all back down.
  const collected = collectCompletedRuns(columns, foundations);
  return {
    scoreDelta: 0,
    flippedCardIds: [
      ...(flipped ? [flipped.id] : []),
      ...collected.flippedCardIds,
    ],
    followUpTransfers: collected.transfers,
  };
}

/**
 * Turns over the newly exposed top card of a pile if the pile is a column, and
 * returns the card turned over, if any.
 *
 * @param columnRole The role of the piles that bury cards.
 */
export function flipExposedTopOfColumn(
  pile: CardPile<PlayingCard>,
  columnRole: PileRole,
): PlayingCard | undefined {
  return pile.role === columnRole ? flipExposedTop(pile) : undefined;
}
