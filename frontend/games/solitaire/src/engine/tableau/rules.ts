import { Card } from "@/engine/core/card/card";
import { CardPile, PileRole } from "@/engine/core/card/card_pile";
import {
  PlayingCard,
  Rank,
  Suit,
  rankAbove,
  rankBelow,
} from "@/engine/core/card/playing_card";

/**
 * A read-only view of the whole board, for rules that depend on more than the
 * pile a card is landing on.
 *
 * FreeCell is why this exists. Its supermove limit is
 * `(free cells + 1) x 2^(empty columns)` — how many cards may move at once is a
 * property of the position, not of the target. A rule that only saw its target
 * could not express it.
 *
 * Narrow on purpose: a rule can ask what is where, and can change nothing.
 */
export interface BoardQuery {
  /** The pile with the given id, or undefined. */
  pile(pileId: string): CardPile<Card> | undefined;

  /** Every pile playing the given part, in the order the game declared them. */
  pilesByRole(role: PileRole): readonly CardPile<Card>[];

  /** How many piles playing the given part are empty. */
  emptyCount(role: PileRole): number;
}

/** Everything a placement rule is allowed to know about a proposed move. */
export interface PlacementContext {
  /** The card being moved: the bottom of the moving stack. */
  readonly card: PlayingCard;

  /** The whole run being moved, bottom-first, including {@link card}. */
  readonly movingStack: readonly PlayingCard[];

  /** The pile the stack is leaving. */
  readonly sourcePile: CardPile<PlayingCard>;

  /** The pile the stack would join. */
  readonly targetPile: CardPile<PlayingCard>;

  /** The rest of the board, for rules that depend on it. */
  readonly board: BoardQuery;
}

/**
 * Whether a proposed move is legal.
 *
 * A function rather than a class so rules compose: a game builds the rule for
 * each of its zones out of the pieces below instead of writing a method per
 * pile role.
 */
export type PlacementRule = (context: PlacementContext) => boolean;

// --- Combinators -----------------------------------------------------------

/** A rule that accepts nothing. The default for a pile that is not a destination. */
export const never: PlacementRule = () => false;

/** A rule that accepts any card. */
export const anyCard: PlacementRule = () => true;

/** A rule that holds only when every one of `rules` holds. */
export function all(...rules: readonly PlacementRule[]): PlacementRule {
  return (context) => rules.every((rule) => rule(context));
}

/** A rule that holds when any one of `rules` holds. */
export function any(...rules: readonly PlacementRule[]): PlacementRule {
  return (context) => rules.some((rule) => rule(context));
}

/**
 * Applies one rule to an empty target and another to an occupied one.
 *
 * The shape almost every build rule actually has: what may start a pile is a
 * different question from what may continue it. An empty Klondike tableau takes
 * a King and an occupied one takes the next card down.
 */
export function byEmptiness(
  whenEmpty: PlacementRule,
  whenOccupied: PlacementRule,
): PlacementRule {
  return (context) =>
    context.targetPile.isEmpty ? whenEmpty(context) : whenOccupied(context);
}

/** A rule that holds when the moved card satisfies `predicate`. */
export function cardIs(
  predicate: (card: PlayingCard) => boolean,
): PlacementRule {
  return (context) => predicate(context.card);
}

/** A rule that holds only for a stack of exactly one card. */
export const singleCardOnly: PlacementRule = (context) =>
  context.movingStack.length === 1;

/**
 * A rule that holds when the moving stack is no larger than the board
 * currently allows.
 *
 * @param limit How many cards may move at once in the given position.
 */
export function maxStackSize(
  limit: (context: PlacementContext) => number,
): PlacementRule {
  return (context) => context.movingStack.length <= limit(context);
}

// --- Playing card rules ----------------------------------------------------

/** Whether the card is a red suit (hearts or diamonds). */
export function isRed(card: PlayingCard): boolean {
  return card.suit === Suit.HEART || card.suit === Suit.DIAMOND;
}

/** A predicate matching cards of the given rank, for use with {@link cardIs}. */
export function hasRank(rank: Rank): (card: PlayingCard) => boolean {
  return (card) => card.rank === rank;
}

/** Builds down by one rank in alternating colors: the Klondike tableau. */
export const descendingAlternatingColor: PlacementRule = (context) => {
  const topCard = context.targetPile.topCard;
  if (!topCard) return false;
  return (
    isRed(context.card) !== isRed(topCard) &&
    context.card.rank === rankBelow(topCard.rank)
  );
};

/** Builds down by one rank regardless of suit: the Spider tableau. */
export const descendingAnySuit: PlacementRule = (context) => {
  const topCard = context.targetPile.topCard;
  if (!topCard) return false;
  return context.card.rank === rankBelow(topCard.rank);
};

/** Builds up by one rank in the same suit: a foundation. */
export const ascendingSameSuit: PlacementRule = (context) => {
  const topCard = context.targetPile.topCard;
  if (!topCard) return false;
  return (
    context.card.suit === topCard.suit &&
    context.card.rank === rankAbove(topCard.rank)
  );
};

/**
 * The standard suit foundation: an Ace starts it, and each card after builds up
 * in the same suit, one at a time. Shared by Klondike, FreeCell and Spider.
 */
export const suitFoundation: PlacementRule = all(
  singleCardOnly,
  byEmptiness(cardIs(hasRank(Rank.ACE)), ascendingSameSuit),
);
