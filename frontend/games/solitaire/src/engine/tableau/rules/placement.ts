import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank } from "@/engine/core/card/playing_card";
import { BoardQuery } from "./board_query";

/** Tells a placement rule everything it may know about a proposed move. */
export interface PlacementContext {
  /** The card being moved: the bottom of the moving stack. */
  readonly card: PlayingCard;

  /** The whole run being moved, bottom-first, including {@link card}. */
  readonly movingStack: readonly PlayingCard[];

  /** The pile the stack is leaving. */
  readonly sourcePile: ReadonlyCardPile<PlayingCard>;

  /** The pile the stack would join. */
  readonly targetPile: ReadonlyCardPile<PlayingCard>;

  /** The rest of the board, for rules that depend on it. */
  readonly board: BoardQuery;
}

/** Decides whether a proposed move is legal. */
export type PlacementRule = (context: PlacementContext) => boolean;

/** A rule that accepts nothing. */
export const never: PlacementRule = () => false;

/** A rule that accepts any card. */
export const anyCard: PlacementRule = () => true;

/** Returns a rule that holds only when every one of `rules` holds. */
export function all(...rules: readonly PlacementRule[]): PlacementRule {
  return (context) => rules.every((rule) => rule(context));
}

/** Returns a rule that holds when any one of `rules` holds. */
export function any(...rules: readonly PlacementRule[]): PlacementRule {
  return (context) => rules.some((rule) => rule(context));
}

/**
 * Returns a rule that applies one rule to an empty target and another to an
 * occupied one.
 */
export function byEmptiness(
  whenEmpty: PlacementRule,
  whenOccupied: PlacementRule,
): PlacementRule {
  return (context) =>
    context.targetPile.isEmpty ? whenEmpty(context) : whenOccupied(context);
}

/** Returns a rule that holds when the moved card satisfies `predicate`. */
export function cardIs(
  predicate: (card: PlayingCard) => boolean,
): PlacementRule {
  return (context) => predicate(context.card);
}

/** Returns a predicate matching one rank, for use with {@link cardIs}. */
export function hasRank(rank: Rank): (card: PlayingCard) => boolean {
  return (card) => card.rank === rank;
}

/** A rule that holds only for a stack of exactly one card. */
export const singleCardOnly: PlacementRule = (context) =>
  context.movingStack.length === 1;

/**
 * Returns a rule that holds when the moving stack is no larger than `limit`
 * allows in the current position.
 */
export function maxStackSize(
  limit: (context: PlacementContext) => number,
): PlacementRule {
  return (context) => context.movingStack.length <= limit(context);
}
