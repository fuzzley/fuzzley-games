import { PileRole } from "@/engine/core/card/card_pile";
import { Rank } from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  all,
  byEmptiness,
  cardIs,
  cellStagingLimit,
  descendingSameSuit,
  hasRank,
  maxStackSize,
  singleCardCell,
  suitFoundation,
} from "@/engine/tableau/rules";

/** The parts a pile can play in a Seahaven Towers game. */
export const SeahavenRole = {
  /** A single-card holding cell. There are four, in the towers along the top. */
  CELL: "cell",
  /** A suit pile built up from Ace to King. */
  FOUNDATION: "foundation",
  /** A board column built down in a single suit. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** One of the parts a Seahaven Towers pile can play. */
export type SeahavenRole = (typeof SeahavenRole)[keyof typeof SeahavenRole];

/**
 * How many cards may be moved at once: `free cells + 1`, with no doubling for
 * empty columns.
 *
 * Exact rather than a conservative approximation, because a Seahaven column
 * takes only a King — see {@link cellStagingLimit} for why that reduces the
 * arithmetic, and why there is no empty-destination special case to write.
 *
 * With only four cells this bites hard: five is the most that can ever move, and
 * four or fewer for almost the whole game. Seahaven is the tightest of the cell
 * games for exactly this reason.
 */
export const supermoveLimit = cellStagingLimit(SeahavenRole.CELL);

/**
 * A Seahaven column: only a King may start an empty one, anything after builds
 * down in the same suit, and no more may move at once than the cells can
 * actually shuffle around.
 */
export const SEAHAVEN_TABLEAU_RULE: PlacementRule = all(
  byEmptiness(cardIs(hasRank(Rank.KING)), descendingSameSuit),
  maxStackSize(supermoveLimit),
);

/** A cell: one card, any card. */
export const SEAHAVEN_CELL_RULE: PlacementRule = singleCardCell;

/** A Seahaven foundation: the standard Ace-up-by-suit pile. */
export const SEAHAVEN_FOUNDATION_RULE: PlacementRule = suitFoundation;

/**
 * The rule governing what a pile of the given role accepts, or null for a role
 * that is never a destination. Every Seahaven pile is one: there is no stock
 * and no waste.
 *
 * @param role The part the pile plays.
 */
export function seahavenPlacementRule(role: string): PlacementRule | null {
  switch (role) {
    case SeahavenRole.TABLEAU:
      return SEAHAVEN_TABLEAU_RULE;
    case SeahavenRole.CELL:
      return SEAHAVEN_CELL_RULE;
    case SeahavenRole.FOUNDATION:
      return SEAHAVEN_FOUNDATION_RULE;
    default:
      return null;
  }
}
