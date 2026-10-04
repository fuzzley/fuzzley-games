import { PileRole } from "@/engine/core/card/card_pile";
import { Rank } from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  all,
  cardIs,
  hasRank,
  singleCardOnly,
} from "@/engine/tableau/rules";
import {
  PairTest,
  pairsWithTop,
  sameRank,
  totalsThirteen,
} from "../common/pair_removal";

/** The parts a pile can play in a Monte Carlo game. */
export const MonteCarloRole = {
  /** One place in the five-by-five grid. */
  CELL: "cell",
  /** The face-down cards that refill the grid when it is consolidated. */
  STOCK: "stock",
  /** Where the pairs go. */
  DISCARD: "discard",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a Monte Carlo pile can play. */
export type MonteCarloRole =
  (typeof MonteCarloRole)[keyof typeof MonteCarloRole];

/** Which of the pair is being played. */
export const MonteCarloVariant = {
  /** Monte Carlo: pairs of the same rank. */
  MONTE_CARLO: "monte-carlo",
  /** Monte Carlo Thirteens: pairs totalling thirteen, and Kings alone. */
  THIRTEENS: "thirteens",
} as const;

/** Names one of the games played on Monte Carlo's grid. */
export type MonteCarloVariant =
  (typeof MonteCarloVariant)[keyof typeof MonteCarloVariant];

/** The variant dealt when nothing says otherwise. */
export const DEFAULT_MONTE_CARLO_VARIANT: MonteCarloVariant =
  MonteCarloVariant.MONTE_CARLO;

/** Returns the pair test a variant plays by. */
export function monteCarloPairTest(variant: MonteCarloVariant): PairTest {
  return variant === MonteCarloVariant.THIRTEENS ? totalsThirteen : sameRank;
}

/**
 * Returns the rule for a cell: a card from one of `neighbourIds` that pairs
 * with the cell's card.
 */
export function monteCarloCellRule(
  variant: MonteCarloVariant,
  neighbourIds: ReadonlySet<string>,
): PlacementRule {
  return all(
    (context) => neighbourIds.has(context.sourcePile.id),
    pairsWithTop(monteCarloPairTest(variant)),
  );
}

/**
 * Returns what the discard takes under a variant: in Thirteens a King on its
 * own, from the grid, and in Monte Carlo nothing directly.
 */
export function monteCarloDiscardRule(
  variant: MonteCarloVariant,
): PlacementRule | null {
  if (variant !== MonteCarloVariant.THIRTEENS) return null;
  return all(
    singleCardOnly,
    cardIs(hasRank(Rank.KING)),
    (context) => context.sourcePile.role === MonteCarloRole.CELL,
  );
}
