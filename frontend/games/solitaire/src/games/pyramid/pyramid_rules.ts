import { PileRole } from "@/engine/core/card/card_pile";
import { Rank } from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  all,
  cardIs,
  hasRank,
  singleCardOnly,
} from "@/engine/tableau/rules";
import { isUncovered } from "@/engine/tableau/zone";
import { pairsWithTop, totalsThirteen } from "../common/pair_removal";

/** The parts a pile can play in a Pyramid game. */
export const PyramidRole = {
  /** The face-down cards, turned one at a time into the hand. */
  STOCK: "stock",
  /** The card just turned, free to pair. */
  HAND: "hand",
  /** The turned cards that found no pair, whose top card is free. */
  WASTE: "waste",
  /** One place in the pyramid. */
  PYRAMID: "pyramid",
  /** Where pairs and Kings go. */
  DISCARD: "discard",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a Pyramid pile can play. */
export type PyramidRole = (typeof PyramidRole)[keyof typeof PyramidRole];

/** When a game of Pyramid is won. */
export const PyramidGoal = {
  /** Every card discarded, stock and waste included. */
  ALL_CARDS: "all-cards",
  /** Relaxed Pyramid: the pyramid cleared, whatever is left elsewhere. */
  PYRAMID_ONLY: "pyramid-only",
} as const;

/** Names one of the ways a game of Pyramid can be won. */
export type PyramidGoal = (typeof PyramidGoal)[keyof typeof PyramidGoal];

/** The goal dealt when nothing says otherwise. */
export const DEFAULT_PYRAMID_GOAL: PyramidGoal = PyramidGoal.ALL_CARDS;

/** How many times the stock may be gone through: once, or three times. */
export type PyramidPasses = 1 | 3;

/** The passes dealt when nothing says otherwise. */
export const DEFAULT_PYRAMID_PASSES: PyramidPasses = 1;

/**
 * Returns the rule for a place in the pyramid: a card totalling thirteen with
 * its card, while nothing in `coveredBy` lies over it.
 */
export function pyramidPairRule(coveredBy: readonly string[]): PlacementRule {
  return all(
    (context) => isUncovered(coveredBy, context.board),
    pairsWithTop(totalsThirteen),
  );
}

/** The hand and the waste: a card totalling thirteen with the top card. */
export const OPEN_PAIR_RULE: PlacementRule = pairsWithTop(totalsThirteen);

/** The discard: a King on its own, which totals thirteen by itself. */
export const LONE_KING_RULE: PlacementRule = all(
  singleCardOnly,
  cardIs(hasRank(Rank.KING)),
);
