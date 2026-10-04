import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank } from "@/engine/core/card/playing_card";
import { PlacementRule, all, singleCardOnly } from "@/engine/tableau/rules";
import {
  MoveEffects,
  NO_MOVE_EFFECTS,
  ResolvedMove,
} from "@/engine/tableau/table_game";
import { Tabletop } from "@/engine/tableau/tabletop";

/**
 * Plays a pairing game, where a card dropped on its partner takes both to the
 * discard: Nestor, Monte Carlo and Pyramid.
 *
 * A paired pile must have no `capacity`: the engine checks capacity before the
 * accept rule, so a one-card pile would refuse the partner before the pair
 * rule were ever asked. The deal and the rule keep such a pile to one card.
 */

/** Says whether two cards make a pair. */
export type PairTest = (first: PlayingCard, second: PlayingCard) => boolean;

/** Returns whether two cards are the same rank, as Nestor pairs them. */
export const sameRank: PairTest = (first, second) => first.rank === second.rank;

/** What a pair adds up to in the games that pair cards by total. */
export const PAIR_TOTAL = 13;

/** Returns a card's value: one for the Ace up to thirteen for the King. */
export function pipValue(card: PlayingCard): number {
  return card.rank - Rank.ACE + 1;
}

/**
 * Returns whether two cards total thirteen, as Pyramid and Monte Carlo
 * Thirteens pair them, counting the Ace as one, the Jack as eleven and the
 * Queen as twelve.
 */
export const totalsThirteen: PairTest = (first, second) =>
  pipValue(first) + pipValue(second) === PAIR_TOTAL;

/**
 * Returns a rule that takes a single card that makes a pair with the pile's
 * top card.
 */
export function pairsWithTop(isPair: PairTest): PlacementRule {
  return all(singleCardOnly, (context) => {
    const top = context.targetPile.topCard;
    return top !== undefined && isPair(top, context.card);
  });
}

/**
 * Sends the pair a move just made, the card moved and the one it landed on, to
 * the discard, and reports the transfer so one undo puts both back.
 *
 * A move straight onto the discard, such as a King that pairs with nothing,
 * has nothing more to send.
 *
 * @param move The move, already applied to the piles.
 */
export function discardPairEffects(
  tabletop: Tabletop,
  move: ResolvedMove,
  discard: CardPile<PlayingCard>,
): MoveEffects {
  const pile = move.targetPile;
  if (pile === discard) return NO_MOVE_EFFECTS;

  return {
    scoreDelta: 0,
    flippedCardIds: [],
    followUpTransfers: [tabletop.relocate(pile.getCards().slice(-2), discard)],
  };
}
