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
  /**
   * The pile with the given id, or undefined.
   *
   * Typed to {@link PlayingCard} rather than the bare {@link Card} the piles are
   * declared over, because a rule that looks up another pile almost always wants
   * to read a card off it: Montana accepts a card only when it follows the one
   * in the cell to its left, in suit and rank, and neither is visible on a
   * `Card`. Every board handed to a rule is built from playing cards, so this
   * narrows nothing that was ever true.
   */
  pile(pileId: string): CardPile<PlayingCard> | undefined;

  /** Every pile playing the given part, in the order the game declared them. */
  pilesByRole(role: PileRole): readonly CardPile<PlayingCard>[];

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

// --- Run adjacency ---------------------------------------------------------
//
// What may sit directly on what within a run, as a pair of cards rather than a
// board position. Two things ask the question and they have to agree: a zone's
// `run` grab rule, which decides whether a stack may be lifted at all, and the
// build rule below it, which decides whether that stack may land. Defining the
// pair once and deriving the build rule from it is what keeps them from
// drifting apart.

/**
 * Whether `upper` may sit directly on `lower`: one rank down, in the other
 * colour. Klondike and FreeCell build this way.
 */
export function isOrderedPair(lower: PlayingCard, upper: PlayingCard): boolean {
  return upper.rank === rankBelow(lower.rank) && isRed(lower) !== isRed(upper);
}

/**
 * Whether `upper` may sit directly on `lower`: one rank down, in the same suit.
 * Spider lifts runs this way, and Baker's Game, Eight Off and Scorpion build
 * this way as well as lifting.
 */
export function isSameSuitRun(lower: PlayingCard, upper: PlayingCard): boolean {
  return lower.suit === upper.suit && upper.rank === rankBelow(lower.rank);
}

/**
 * Whether `upper` may sit directly on `lower`: one rank down, in the same
 * colour. Whitehead builds and lifts this way.
 *
 * Between {@link isOrderedPair} and {@link isSameSuitRun} in strictness, and
 * that is the whole of Whitehead's character: two suits will take a card where
 * alternating colours would offer two and a single suit only one.
 */
export function isSameColorRun(
  lower: PlayingCard,
  upper: PlayingCard,
): boolean {
  return upper.rank === rankBelow(lower.rank) && isRed(lower) === isRed(upper);
}

/**
 * Whether `upper` may sit directly on `lower`: one rank down, in any suit but
 * `lower`'s own. Thumb and Pouch builds and lifts this way.
 *
 * The laxest of the four, and deliberately not the same as "any suit at all":
 * three of the four suits will take a card, which is what makes Thumb and Pouch
 * the gentle Klondike rather than a game with no column rule.
 */
export function isDifferentSuitRun(
  lower: PlayingCard,
  upper: PlayingCard,
): boolean {
  return lower.suit !== upper.suit && upper.rank === rankBelow(lower.rank);
}

/** Builds down by one rank in alternating colors: the Klondike tableau. */
export const descendingAlternatingColor: PlacementRule = (context) => {
  const topCard = context.targetPile.topCard;
  return topCard ? isOrderedPair(topCard, context.card) : false;
};

/**
 * Builds down by one rank in the same suit: the Baker's Game, Eight Off and
 * Scorpion tableau, and the harder half of the Yukon family.
 */
export const descendingSameSuit: PlacementRule = (context) => {
  const topCard = context.targetPile.topCard;
  return topCard ? isSameSuitRun(topCard, context.card) : false;
};

/** Builds down by one rank in the same color: the Whitehead tableau. */
export const descendingSameColor: PlacementRule = (context) => {
  const topCard = context.targetPile.topCard;
  return topCard ? isSameColorRun(topCard, context.card) : false;
};

/**
 * Builds down by one rank in any suit but the one below it: the Thumb and
 * Pouch tableau.
 */
export const descendingDifferentSuit: PlacementRule = (context) => {
  const topCard = context.targetPile.topCard;
  return topCard ? isDifferentSuitRun(topCard, context.card) : false;
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
