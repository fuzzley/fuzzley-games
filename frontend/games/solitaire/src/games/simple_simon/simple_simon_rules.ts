import { PileRole } from "@/engine/core/card/card_pile";
import { DeckSpec } from "@/engine/core/card/deck";
import { ALL_RANKS, ALL_SUITS } from "@/engine/core/card/playing_card";
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
 * Which board Simple Simon's rules are played on.
 *
 * Numbered because the settings panel stores an option as a number, which the
 * catalog hands straight to the game.
 */
export const SimpleSimonVariant = {
  /** Simple Simon: one deck in a staircase of ten columns. */
  SIMPLE_SIMON: 0,
  /** Mrs. Mop: two decks in thirteen columns of eight. */
  MRS_MOP: 1,
} as const;

/** Names one of the boards Simple Simon's rules are played on. */
export type SimpleSimonVariant =
  (typeof SimpleSimonVariant)[keyof typeof SimpleSimonVariant];

/** The variant dealt when nothing says otherwise. */
export const DEFAULT_SIMPLE_SIMON_VARIANT: SimpleSimonVariant =
  SimpleSimonVariant.SIMPLE_SIMON;

/** Holds what a variant decides: how many decks, and how they are dealt. */
interface VariantBoard {
  /** How many full decks are dealt. */
  readonly copies: number;
  /** How many cards each column is dealt, left to right. */
  readonly cardsPerColumn: readonly number[];
}

/**
 * What each variant deals. The columns and foundations follow from it: one
 * column per entry, and one foundation per suit of each deck.
 */
const VARIANT_BOARDS: Readonly<Record<SimpleSimonVariant, VariantBoard>> = {
  [SimpleSimonVariant.SIMPLE_SIMON]: {
    copies: 1,
    cardsPerColumn: [8, 8, 8, 7, 6, 5, 4, 3, 2, 1],
  },
  [SimpleSimonVariant.MRS_MOP]: {
    copies: 2,
    cardsPerColumn: Array<number>(13).fill(8),
  },
};

/** Returns the cards `variant` deals. */
export function simpleSimonDeck(variant: SimpleSimonVariant): DeckSpec {
  return {
    suits: ALL_SUITS,
    ranks: ALL_RANKS,
    copies: VARIANT_BOARDS[variant].copies,
  };
}

/** Returns how many cards `variant` deals each column, left to right. */
export function simpleSimonCardsPerColumn(
  variant: SimpleSimonVariant,
): readonly number[] {
  return VARIANT_BOARDS[variant].cardsPerColumn;
}

/** Returns how many columns `variant` lays out. */
export function simpleSimonTableauCount(variant: SimpleSimonVariant): number {
  return VARIANT_BOARDS[variant].cardsPerColumn.length;
}

/**
 * Returns how many foundations `variant` lays out: one per completed run a
 * full game produces.
 */
export function simpleSimonFoundationCount(
  variant: SimpleSimonVariant,
): number {
  return ALL_SUITS.length * VARIANT_BOARDS[variant].copies;
}

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
