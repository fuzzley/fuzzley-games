import { PileRole } from "@/engine/core/card/card_pile";
import {
  Rank,
  rankAbove,
  rankAboveWrapping,
} from "@/engine/core/card/playing_card";
import {
  Adjacency,
  isAnySuitRun,
  isAnySuitRunWrapping,
  isDifferentSuitRun,
  isOrderedPair,
  isOrderedPairWrapping,
  isSameColorRun,
  isSameSuitRun,
  isSameSuitRunWrapping,
} from "./adjacency";
import { BoardQuery } from "./board_query";
import {
  PlacementContext,
  PlacementRule,
  all,
  anyCard,
  byEmptiness,
  cardIs,
  hasRank,
  singleCardOnly,
} from "./placement";

/**
 * Returns a build rule that lets a card land on a pile whose top card it may
 * sit on by `adjacent`.
 */
export function buildsOn(adjacent: Adjacency): PlacementRule {
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
 * Returns the rank every foundation of `role` starts on: the bottom card of the
 * first one holding any, or undefined while they are all empty.
 *
 * For a game whose deal chooses the starting rank, such as Canfield or
 * Penguin. Read from the board rather than kept by the game, so it needs no
 * saving and is right after every restart and restore.
 */
export function baseRankOf(
  board: BoardQuery,
  role: PileRole,
): Rank | undefined {
  for (const pile of board.pilesByRole(role)) {
    const bottom = pile.getCards()[0];
    if (bottom) return bottom.rank;
  }
  return undefined;
}

/**
 * Returns a foundation that starts on the rank the deal chose, read with
 * {@link baseRankOf}, and builds up in suit from it, turning the corner from
 * King to Ace.
 *
 * While every foundation of `role` is empty any card may start one, and so
 * decide the rank for the rest.
 */
export function baseRankFoundation(role: PileRole): PlacementRule {
  return all(
    singleCardOnly,
    byEmptiness((context) => {
      const base = baseRankOf(context.board, role);
      return base === undefined || context.card.rank === base;
    }, ascendingSameSuitWrapping),
  );
}

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
