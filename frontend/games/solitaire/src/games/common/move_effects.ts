import { CardPile, PileRole } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { collectCompletedRuns, flipExposedTop } from "./completed_runs";

/**
 * What a move does beyond relocating its cards, for the two shapes most games
 * share.
 *
 * Six of the fourteen games answered `applyMoveEffects` with one of exactly two
 * bodies, each written out in full and differing only in the name of the
 * tableau role — the three run-collecting games were byte-identical to one
 * another down to the comment.
 */

/**
 * Turns over the card a move exposed, if it left a column.
 *
 * The whole of what Yukon, Easthaven and Forty Thieves do beyond moving cards:
 * no score, and nothing follows on. A move leaving a foundation or a cell
 * exposes nothing worth turning, which is what the role check is for.
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
 * Spider, Spiderette and Scorpion, whose runs leave the tableau by completing
 * themselves rather than by being carried. Both the flip and the collection are
 * reported as one move's effects, which is what makes a single undo take the
 * whole thing back.
 *
 * @param move The move, already applied to the piles.
 * @param columnRole The role of the piles that bury cards.
 * @param columns The columns a completed run may be sitting in.
 * @param foundations The piles a completed run is sent to.
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
 * Turns over the newly exposed top card of a pile, if that pile is a column.
 *
 * The role guard is the point: a move leaving a foundation, a cell or the waste
 * exposes nothing that was hidden, so there is nothing to turn and no bonus to
 * award for turning it. Klondike and Double Klondike call this directly,
 * because they score the flip as well as making it.
 *
 * @param pile The pile the move left.
 * @param columnRole The role of the piles that bury cards.
 * @returns The card turned over, or undefined if nothing was.
 */
export function flipExposedTopOfColumn(
  pile: CardPile<PlayingCard>,
  columnRole: PileRole,
): PlayingCard | undefined {
  return pile.role === columnRole ? flipExposedTop(pile) : undefined;
}
