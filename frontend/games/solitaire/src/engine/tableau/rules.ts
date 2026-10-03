import { CardPile, PileRole } from "@/engine/core/card/card_pile";
import {
  PlayingCard,
  Rank,
  Suit,
  rankAbove,
  rankAboveWrapping,
  rankBelow,
  rankBelowWrapping,
} from "@/engine/core/card/playing_card";

/**
 * Lets a rule read the whole board, for rules that depend on more than the pile
 * a card is landing on.
 */
export interface BoardQuery {
  /** Returns the pile with the given id, or undefined. */
  pile(pileId: string): CardPile<PlayingCard> | undefined;

  /** Returns every pile playing a part, in declaration order. */
  pilesByRole(role: PileRole): readonly CardPile<PlayingCard>[];

  /** Returns how many piles playing the given part are empty. */
  emptyCount(role: PileRole): number;
}

/** Tells a placement rule everything it may know about a proposed move. */
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

/** Decides whether a proposed move is legal. */
export type PlacementRule = (context: PlacementContext) => boolean;

// --- Combinators -----------------------------------------------------------

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

// --- Playing card rules ----------------------------------------------------

/** Returns whether the card is a red suit (hearts or diamonds). */
export function isRed(card: PlayingCard): boolean {
  return card.suit === Suit.HEART || card.suit === Suit.DIAMOND;
}

/** Returns a predicate matching one rank, for use with {@link cardIs}. */
export function hasRank(rank: Rank): (card: PlayingCard) => boolean {
  return (card) => card.rank === rank;
}

// --- Run adjacency ---------------------------------------------------------
//
// Whether one card may sit directly on another. A zone's `run` grab rule and
// its build rule both ask this, and deriving both from one pair predicate is
// what keeps them in agreement.

/**
 * Returns whether `upper` may sit on `lower` as in Klondike: one rank down, in
 * the other colour.
 */
export function isOrderedPair(lower: PlayingCard, upper: PlayingCard): boolean {
  return upper.rank === rankBelow(lower.rank) && isRed(lower) !== isRed(upper);
}

/**
 * Returns whether `upper` may sit on `lower` as in a Spider run: one rank
 * down, in the same suit.
 */
export function isSameSuitRun(lower: PlayingCard, upper: PlayingCard): boolean {
  return lower.suit === upper.suit && upper.rank === rankBelow(lower.rank);
}

/**
 * Returns whether `upper` may sit on `lower` as in Whitehead: one rank down, in
 * the same colour.
 */
export function isSameColorRun(
  lower: PlayingCard,
  upper: PlayingCard,
): boolean {
  return upper.rank === rankBelow(lower.rank) && isRed(lower) === isRed(upper);
}

/**
 * Returns whether `upper` may sit on `lower` as in Thumb and Pouch: one rank
 * down, in any suit but `lower`'s own.
 */
export function isDifferentSuitRun(
  lower: PlayingCard,
  upper: PlayingCard,
): boolean {
  return lower.suit !== upper.suit && upper.rank === rankBelow(lower.rank);
}

/**
 * Returns whether `upper` may sit on `lower` as in a Spider build: one rank
 * down, in any suit.
 */
export function isAnySuitRun(lower: PlayingCard, upper: PlayingCard): boolean {
  return upper.rank === rankBelow(lower.rank);
}

/**
 * Returns whether `upper` may sit on `lower` as in a Penguin run: one rank
 * down in the same suit, with an Ace taking a King.
 */
export function isSameSuitRunWrapping(
  lower: PlayingCard,
  upper: PlayingCard,
): boolean {
  return (
    lower.suit === upper.suit && upper.rank === rankBelowWrapping(lower.rank)
  );
}

/**
 * Returns whether `upper` may sit on `lower` as in Canfield: one rank down in
 * the other colour, with an Ace taking a King.
 */
export function isOrderedPairWrapping(
  lower: PlayingCard,
  upper: PlayingCard,
): boolean {
  return (
    upper.rank === rankBelowWrapping(lower.rank) &&
    isRed(lower) !== isRed(upper)
  );
}

/**
 * Returns whether `upper` may sit on `lower` as in Rainbow: one rank down in
 * any suit, with an Ace taking a King.
 */
export function isAnySuitRunWrapping(
  lower: PlayingCard,
  upper: PlayingCard,
): boolean {
  return upper.rank === rankBelowWrapping(lower.rank);
}

/**
 * Returns an adjacency that holds when the two cards are one rank apart either
 * way, in any suit, as on a Golf foundation.
 *
 * @param wraps Whether an Ace and a King count as one rank apart.
 */
export function isAdjacentRank(
  wraps: boolean,
): (lower: PlayingCard, upper: PlayingCard) => boolean {
  return (lower, upper) => {
    const apart = Math.abs(lower.rank - upper.rank);
    return apart === 1 || (wraps && apart === Rank.KING - Rank.ACE);
  };
}

/**
 * Returns a build rule that lets a card land on a pile whose top card it may
 * sit on by `adjacent`.
 */
export function buildsOn(
  adjacent: (lower: PlayingCard, upper: PlayingCard) => boolean,
): PlacementRule {
  return (context) => {
    const topCard = context.targetPile.topCard;
    return topCard ? adjacent(topCard, context.card) : false;
  };
}

/** Builds down by one rank in alternating colors: the Klondike tableau. */
export const descendingAlternatingColor: PlacementRule =
  buildsOn(isOrderedPair);

/**
 * Builds down by one rank in the same suit: the Baker's Game, Eight Off and
 * Scorpion tableau, and the harder half of the Yukon family.
 */
export const descendingSameSuit: PlacementRule = buildsOn(isSameSuitRun);

/** Builds down by one rank in the same color: the Whitehead tableau. */
export const descendingSameColor: PlacementRule = buildsOn(isSameColorRun);

/**
 * Builds down by one rank in any suit but the one below it: the Thumb and
 * Pouch tableau.
 */
export const descendingDifferentSuit: PlacementRule =
  buildsOn(isDifferentSuitRun);

/** Builds down by one rank regardless of suit: the Spider tableau. */
export const descendingAnySuit: PlacementRule = buildsOn(isAnySuitRun);

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
 * Builds up by one rank in the same suit, turning the corner from King to Ace:
 * a foundation that starts on a rank the deal chooses.
 */
export const ascendingSameSuitWrapping: PlacementRule = buildsOn(
  (lower, upper) =>
    lower.suit === upper.suit && upper.rank === rankAboveWrapping(lower.rank),
);

/** Builds up by one rank regardless of suit: a Bristol or Sir Tommy foundation. */
export const ascendingAnySuit: PlacementRule = buildsOn(
  (lower, upper) => upper.rank === rankAbove(lower.rank),
);

/**
 * Builds down by one rank in the same suit, with an Ace taking a King: the
 * Penguin tableau.
 */
export const descendingSameSuitWrapping: PlacementRule = buildsOn(
  isSameSuitRunWrapping,
);

/**
 * Builds down by one rank in alternating colours, with an Ace taking a King:
 * the Canfield tableau.
 */
export const descendingAlternatingColorWrapping: PlacementRule = buildsOn(
  isOrderedPairWrapping,
);

/**
 * Builds down by one rank in any suit, with an Ace taking a King: the Rainbow
 * tableau.
 */
export const descendingAnySuitWrapping: PlacementRule =
  buildsOn(isAnySuitRunWrapping);

/**
 * The standard suit foundation: an Ace starts it, and each card after builds up
 * in the same suit, one at a time.
 */
export const suitFoundation: PlacementRule = all(
  singleCardOnly,
  byEmptiness(cardIs(hasRank(Rank.ACE)), ascendingSameSuit),
);

/** A holding cell: one card, and any card will do. */
export const singleCardCell: PlacementRule = all(singleCardOnly, anyCard);

/**
 * Returns how many cards the empty piles of `cellRole` let a player move at
 * once: `free cells + 1`.
 *
 * For games whose empty columns take only Kings: no part of a same-suit run
 * but its bottom card is a King, so unlike in FreeCell an empty column cannot
 * stage anything and adds no `x 2 ^ (empty columns)` term.
 */
export function cellStagingLimit(
  cellRole: PileRole,
): (context: PlacementContext) => number {
  return (context) => context.board.emptyCount(cellRole) + 1;
}
