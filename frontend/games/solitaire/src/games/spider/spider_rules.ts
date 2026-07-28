import { PileRole } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank, rankBelow } from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  anyCard,
  byEmptiness,
  descendingAnySuit,
  never,
} from "@/engine/tableau/rules";

/** The parts a pile can play in a Spider game. */
export const SpiderRole = {
  /** The face-down pile that deals a row at a time. */
  STOCK: "stock",
  /** Where a completed King-to-Ace run goes. */
  FOUNDATION: "foundation",
  /** A board column built down by rank, any suit. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** One of the parts a Spider pile can play. */
export type SpiderRole = (typeof SpiderRole)[keyof typeof SpiderRole];

/**
 * A Spider column: any card starts an empty one, and anything after builds down
 * by rank regardless of suit.
 *
 * Suit only matters for *lifting* a run, not for landing one — which is what
 * makes Spider hard, since a mixed-suit pile is easy to build and impossible to
 * move.
 */
export const SPIDER_TABLEAU_RULE: PlacementRule = byEmptiness(
  anyCard,
  descendingAnySuit,
);

/**
 * Whether `upper` may sit directly on `lower` within a movable run: one rank
 * down, in the same suit.
 */
export function isSameSuitRun(lower: PlayingCard, upper: PlayingCard): boolean {
  return lower.suit === upper.suit && upper.rank === rankBelow(lower.rank);
}

/**
 * Whether the top `13` cards of the given run are a complete King-to-Ace
 * sequence in one suit, which Spider removes from the board.
 *
 * @param cards A column's cards, bottom-first.
 */
export function completedRunStart(cards: readonly PlayingCard[]): number {
  if (cards.length < RUN_LENGTH) return -1;

  const start = cards.length - RUN_LENGTH;
  const run = cards.slice(start);
  if (run[0].rank !== Rank.KING || run[run.length - 1].rank !== Rank.ACE) {
    return -1;
  }
  for (let index = 0; index < run.length - 1; index++) {
    if (!run[index].faceUp) return -1;
    if (!isSameSuitRun(run[index], run[index + 1])) return -1;
  }
  return start;
}

/** How many cards a complete run holds: King down to Ace. */
export const RUN_LENGTH = 13;

/**
 * The rule governing what a pile of the given role accepts, or null for one
 * that is never a destination.
 *
 * The stock is never dropped onto, and neither are the foundations: a Spider
 * foundation is not somewhere a player puts a card, it is where a completed run
 * goes by itself.
 */
export function spiderPlacementRule(role: string): PlacementRule | null {
  switch (role) {
    case SpiderRole.TABLEAU:
      return SPIDER_TABLEAU_RULE;
    default:
      return null;
  }
}

/** Exported for symmetry with the other games; nothing accepts a drop but a column. */
export const SPIDER_NON_TARGET_RULE = never;
