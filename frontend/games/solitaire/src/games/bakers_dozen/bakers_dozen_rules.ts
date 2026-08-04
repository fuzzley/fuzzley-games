import { PileRole } from "@/engine/core/card/card_pile";
import {
  PlacementRule,
  byEmptiness,
  descendingAnySuit,
  never,
  suitFoundation,
} from "@/engine/tableau/rules";

/** The parts a pile can play in a Baker's Dozen game. */
export const BakersDozenRole = {
  /** A suit pile built up from Ace to King. */
  FOUNDATION: "foundation",
  /** A board column built down by rank, any suit. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** One of the parts a Baker's Dozen pile can play. */
export type BakersDozenRole =
  (typeof BakersDozenRole)[keyof typeof BakersDozenRole];

/**
 * A Baker's Dozen column: builds down by rank in any suit, and an empty one
 * takes nothing at all.
 *
 * The empty-column rule is the whole game. Every other solitaire here treats a
 * cleared column as the most valuable thing on the board — somewhere to park a
 * run, somewhere to start a King. Here it is worth nothing, permanently: once a
 * column is gone it stays gone, so emptying one is pure loss unless its cards
 * went somewhere useful. That inverts the usual instinct, and it is why a
 * thirteen-column board with no stock is still hard.
 *
 * Stated as `never` on the empty branch rather than by leaving the zone's
 * `accept` null, which would be a different claim: a column *is* a place cards
 * are dropped, so a drag should offer it and the rules should refuse this
 * particular drop. A null would stop the column being a target at all, even
 * when it is holding cards.
 */
export const BAKERS_DOZEN_TABLEAU_RULE: PlacementRule = byEmptiness(
  never,
  descendingAnySuit,
);

/** A Baker's Dozen foundation: the standard Ace-up-by-suit pile. */
export const BAKERS_DOZEN_FOUNDATION_RULE: PlacementRule = suitFoundation;

/**
 * The rule governing what a pile of the given role accepts, or null for a role
 * that is never a destination.
 *
 * Both roles are destinations: there is no stock and no waste, as in FreeCell
 * and the Yukon family.
 *
 * @param role The part the pile plays.
 */
export function bakersDozenPlacementRule(role: string): PlacementRule | null {
  switch (role) {
    case BakersDozenRole.TABLEAU:
      return BAKERS_DOZEN_TABLEAU_RULE;
    case BakersDozenRole.FOUNDATION:
      return BAKERS_DOZEN_FOUNDATION_RULE;
    default:
      return null;
  }
}
