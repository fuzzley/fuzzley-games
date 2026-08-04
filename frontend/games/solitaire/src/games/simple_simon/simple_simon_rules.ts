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

/** One of the parts a Simple Simon pile can play. */
export type SimpleSimonRole =
  (typeof SimpleSimonRole)[keyof typeof SimpleSimonRole];

/**
 * A Simple Simon column: any card starts an empty one, and anything after
 * builds down by rank regardless of suit.
 *
 * The same rule Spider plays by, and for the same reason: suit matters for
 * *lifting* a run, not for landing one. What separates the two games is
 * everything around this rule rather than the rule itself — one deck instead of
 * two, no stock at all, and every card face up from the first move. Simple Simon
 * is Spider with the hidden information and the dealt rows taken away, which is
 * what makes it a puzzle to be solved rather than a game to be survived.
 */
export const SIMPLE_SIMON_TABLEAU_RULE: PlacementRule = byEmptiness(
  anyCard,
  descendingAnySuit,
);

/**
 * The rule governing what a pile of the given role accepts, or null for one
 * that is never a destination.
 *
 * There is no stock, so a column is the only thing on the board a card can be
 * dropped onto: a foundation is not somewhere a player puts a card, it is where
 * a completed run goes by itself.
 */
export function simpleSimonPlacementRule(role: string): PlacementRule | null {
  switch (role) {
    case SimpleSimonRole.TABLEAU:
      return SIMPLE_SIMON_TABLEAU_RULE;
    default:
      return null;
  }
}
