import { PileRole } from "@/engine/core/card/card_pile";
import { Rank } from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  byEmptiness,
  cardIs,
  descendingAlternatingColor,
  hasRank,
  suitFoundation,
} from "@/engine/tableau/rules";

/** The parts a pile can play in an Easthaven game. */
export const EasthavenRole = {
  /** The face-down pile that deals a row at a time. */
  STOCK: "stock",
  /** A suit pile built up from Ace to King. */
  FOUNDATION: "foundation",
  /** A board column built down in alternating colors. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** One of the parts an Easthaven pile can play. */
export type EasthavenRole = (typeof EasthavenRole)[keyof typeof EasthavenRole];

/**
 * An Easthaven column: a King starts an empty one, and anything after builds
 * down in alternating colors.
 *
 * Klondike's column rule exactly. What makes Easthaven its own game is the pair
 * this rule is bolted to: Spider's row-dealing stock, and a stock that refuses
 * to deal while any column stands empty. Kings-only spaces are an inconvenience
 * in Klondike, where the stock keeps offering cards regardless; here they can
 * end the game outright, because a column you cannot fill is a stock you cannot
 * use.
 *
 * Nothing limits how many cards may land at once. It does not need to: an
 * Easthaven run is carried in one piece rather than staged through spare
 * squares the way a FreeCell supermove is, so there is no staging capacity to
 * run out of.
 */
export const EASTHAVEN_TABLEAU_RULE: PlacementRule = byEmptiness(
  cardIs(hasRank(Rank.KING)),
  descendingAlternatingColor,
);

/** An Easthaven foundation: the standard Ace-up-by-suit pile, one at a time. */
export const EASTHAVEN_FOUNDATION_RULE: PlacementRule = suitFoundation;

/**
 * The rule governing what a pile of the given role accepts, or null for one
 * that is never a destination.
 *
 * The stock is never dropped onto. The foundations are, which is what separates
 * this game from Spider and Scorpion: a card reaches a foundation because the
 * player put it there, not because a run completed itself.
 *
 * @param role The part the pile plays.
 */
export function easthavenPlacementRule(role: string): PlacementRule | null {
  switch (role) {
    case EasthavenRole.TABLEAU:
      return EASTHAVEN_TABLEAU_RULE;
    case EasthavenRole.FOUNDATION:
      return EASTHAVEN_FOUNDATION_RULE;
    default:
      return null;
  }
}
