import { PileRole } from "@/engine/core/card/card_pile";
import {
  PlacementRule,
  anyCard,
  byEmptiness,
  descendingAnySuit,
} from "@/engine/tableau/rules";

/** The parts a pile can play in a Spiderette game. */
export const SpideretteRole = {
  /** The face-down pile that deals a row at a time. */
  STOCK: "stock",
  /** Where a completed King-to-Ace run goes. */
  FOUNDATION: "foundation",
  /** A board column built down by rank, any suit. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** One of the parts a Spiderette pile can play. */
export type SpideretteRole =
  (typeof SpideretteRole)[keyof typeof SpideretteRole];

/**
 * Which of the two deals is being played.
 *
 * The pair share everything but the opening layout — the same seven columns, the
 * same build rule, the same grab rule, the same row-dealing stock — so the
 * difference is a deal function rather than a module.
 *
 * Numbered rather than named because the settings panel stores an option as a
 * number: making the variant those numbers lets the catalog hand its choice
 * straight to the game instead of keeping a translation table that could drift
 * from the choices it offers.
 */
export const SpideretteVariant = {
  /** Klondike's triangular deal: columns of one through seven. */
  SPIDERETTE: 0,
  /** Will o' the Wisp: seven columns of three, two of them buried. */
  WILL_O_THE_WISP: 1,
} as const;

/** One of the two games in the Spiderette family. */
export type SpideretteVariant =
  (typeof SpideretteVariant)[keyof typeof SpideretteVariant];

/** The variant dealt when nothing says otherwise. */
export const DEFAULT_SPIDERETTE_VARIANT: SpideretteVariant =
  SpideretteVariant.SPIDERETTE;

/**
 * A Spiderette column: any card starts an empty one, and anything after builds
 * down by rank regardless of suit.
 *
 * Spider's rule on one deck. Suit matters for lifting a run, not for landing
 * one, which is what lets a column build up into a jumble that cannot be moved.
 */
export const SPIDERETTE_TABLEAU_RULE: PlacementRule = byEmptiness(
  anyCard,
  descendingAnySuit,
);

/**
 * The rule governing what a pile of the given role accepts, or null for one
 * that is never a destination.
 *
 * The stock is never dropped onto, and neither are the foundations: a run
 * arrives at one by completing itself, not by being put there.
 */
export function spiderettePlacementRule(role: string): PlacementRule | null {
  switch (role) {
    case SpideretteRole.TABLEAU:
      return SPIDERETTE_TABLEAU_RULE;
    default:
      return null;
  }
}
