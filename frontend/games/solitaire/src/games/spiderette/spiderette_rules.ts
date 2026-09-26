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

/** Names one of the parts a Spiderette pile can play. */
export type SpideretteRole =
  (typeof SpideretteRole)[keyof typeof SpideretteRole];

/**
 * Which of the two deals is being played.
 *
 * Numbered because the settings panel stores an option as a number, which the
 * catalog hands straight to the game.
 */
export const SpideretteVariant = {
  /** Klondike's triangular deal: columns of one through seven. */
  SPIDERETTE: 0,
  /** Will o' the Wisp: seven columns of three, two of them buried. */
  WILL_O_THE_WISP: 1,
} as const;

/** Names one of the two games in the Spiderette family. */
export type SpideretteVariant =
  (typeof SpideretteVariant)[keyof typeof SpideretteVariant];

/** The variant dealt when nothing says otherwise. */
export const DEFAULT_SPIDERETTE_VARIANT: SpideretteVariant =
  SpideretteVariant.SPIDERETTE;

/**
 * A Spiderette column: any card starts an empty one, and anything after builds
 * down by rank regardless of suit.
 *
 * Suit matters only for lifting a run, which the zone's grab rule checks.
 */
export const SPIDERETTE_TABLEAU_RULE: PlacementRule = byEmptiness(
  anyCard,
  descendingAnySuit,
);

/**
 * Returns what a pile of a role accepts, or null for the stock and the
 * foundations, where a player never puts a card.
 */
export function spiderettePlacementRule(role: string): PlacementRule | null {
  switch (role) {
    case SpideretteRole.TABLEAU:
      return SPIDERETTE_TABLEAU_RULE;
    default:
      return null;
  }
}
