import { PileRole } from "@/engine/core/card/card_pile";
import {
  PlacementRule,
  anyCard,
  byEmptiness,
  descendingAnySuit,
} from "@/engine/tableau/rules";

/** The parts a pile can play in a Simple Simon game. */
export const SimpleSimonRole = {
  /** Where a completed King-to-Ace run goes. */
  FOUNDATION: "foundation",
  /** A board column built down by rank, any suit. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a Simple Simon pile can play. */
export type SimpleSimonRole =
  (typeof SimpleSimonRole)[keyof typeof SimpleSimonRole];

/**
 * A Simple Simon column: any card starts an empty one, and anything after
 * builds down by rank regardless of suit.
 *
 * Suit matters only for lifting a run, which the zone's grab rule checks.
 */
export const SIMPLE_SIMON_TABLEAU_RULE: PlacementRule = byEmptiness(
  anyCard,
  descendingAnySuit,
);

/**
 * Returns what a pile of a role accepts, or null for a foundation, where a
 * player never puts a card.
 */
export function simpleSimonPlacementRule(role: string): PlacementRule | null {
  switch (role) {
    case SimpleSimonRole.TABLEAU:
      return SIMPLE_SIMON_TABLEAU_RULE;
    default:
      return null;
  }
}
