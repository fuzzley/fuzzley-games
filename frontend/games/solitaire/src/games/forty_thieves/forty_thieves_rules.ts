import { PileRole } from "@/engine/core/card/card_pile";
import {
  PlacementRule,
  anyCard,
  byEmptiness,
} from "@/engine/tableau/rules/placement";
import {
  descendingAlternatingColor,
  descendingDifferentSuit,
  descendingSameSuit,
  suitFoundation,
} from "@/engine/tableau/rules/builds";
import { isOrderedPair, isSameSuitRun } from "@/engine/tableau/rules/adjacency";
import { GrabRule } from "@/engine/tableau/rules/grab";

/** The parts a pile can play in a Forty Thieves game. */
export const FortyThievesRole = {
  /** The face-down draw pile. */
  STOCK: "stock",
  /** The face-up pile of drawn cards. */
  WASTE: "waste",
  /** A suit pile built up from Ace to King. */
  FOUNDATION: "foundation",
  /** A board column, built by whichever rule the variant names. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a Forty Thieves pile can play. */
export type FortyThievesRole =
  (typeof FortyThievesRole)[keyof typeof FortyThievesRole];

/** Which of the Forty Thieves family is being played. */
export const FortyThievesVariant = {
  /** The original: build down in suit, and move one card at a time. */
  FORTY_THIEVES: "forty-thieves",
  /** Josephine, also called Streets: the same build, but runs may be moved. */
  JOSEPHINE: "josephine",
  /** Rank and File: alternating colours, with three cards buried per column. */
  RANK_AND_FILE: "rank-and-file",
  /** Maria: nine columns of four, built down in alternating colours. */
  MARIA: "maria",
  /** Limited: twelve columns of three, built down in suit. */
  LIMITED: "limited",
  /** Indian: columns of three, one buried, built down in any other suit. */
  INDIAN: "indian",
  /** Number Ten: two of every four buried, alternating colours, runs move. */
  NUMBER_TEN: "number-ten",
  /** Lucas: thirteen columns of three in suit, the Aces already home. */
  LUCAS: "lucas",
} as const;

/** Names one of the games in the Forty Thieves family. */
export type FortyThievesVariant =
  (typeof FortyThievesVariant)[keyof typeof FortyThievesVariant];

/** The variant dealt when nothing says otherwise. */
export const DEFAULT_FORTY_THIEVES_VARIANT: FortyThievesVariant =
  FortyThievesVariant.FORTY_THIEVES;

/** Holds everything a variant decides, which has to hang together. */
interface VariantRules {
  /** What an occupied column accepts. */
  readonly occupied: PlacementRule;
  /** What may be taken from a column. */
  readonly grab: GrabRule;
  /** How many cards of each column the deal buries. */
  readonly buriedPerColumn: number;
  /** How many columns the board has. */
  readonly tableauCount: number;
  /** How many cards each column is dealt. */
  readonly cardsPerColumn: number;
  /** Whether the deal starts every foundation with its Ace. */
  readonly acesStartOnFoundations: boolean;
}

/**
 * What each variant changes, in one table so each build rule sits beside the
 * grab rule it has to agree with.
 *
 * No stack limit applies, since with no cells a run moves in one piece.
 */
const VARIANT_RULES: Readonly<Record<FortyThievesVariant, VariantRules>> = {
  [FortyThievesVariant.FORTY_THIEVES]: {
    occupied: descendingSameSuit,
    grab: { kind: "top-only" },
    buriedPerColumn: 0,
    tableauCount: 10,
    cardsPerColumn: 4,
    acesStartOnFoundations: false,
  },
  [FortyThievesVariant.JOSEPHINE]: {
    occupied: descendingSameSuit,
    grab: { kind: "run", adjacent: isSameSuitRun },
    buriedPerColumn: 0,
    tableauCount: 10,
    cardsPerColumn: 4,
    acesStartOnFoundations: false,
  },
  [FortyThievesVariant.RANK_AND_FILE]: {
    occupied: descendingAlternatingColor,
    grab: { kind: "run", adjacent: isOrderedPair },
    buriedPerColumn: 3,
    tableauCount: 10,
    cardsPerColumn: 4,
    acesStartOnFoundations: false,
  },
  [FortyThievesVariant.MARIA]: {
    occupied: descendingAlternatingColor,
    grab: { kind: "run", adjacent: isOrderedPair },
    buriedPerColumn: 0,
    tableauCount: 9,
    cardsPerColumn: 4,
    acesStartOnFoundations: false,
  },
  [FortyThievesVariant.LIMITED]: {
    occupied: descendingSameSuit,
    grab: { kind: "run", adjacent: isSameSuitRun },
    buriedPerColumn: 0,
    tableauCount: 12,
    cardsPerColumn: 3,
    acesStartOnFoundations: false,
  },
  [FortyThievesVariant.INDIAN]: {
    occupied: descendingDifferentSuit,
    grab: { kind: "top-only" },
    buriedPerColumn: 1,
    tableauCount: 10,
    cardsPerColumn: 3,
    acesStartOnFoundations: false,
  },
  [FortyThievesVariant.NUMBER_TEN]: {
    occupied: descendingAlternatingColor,
    grab: { kind: "run", adjacent: isOrderedPair },
    buriedPerColumn: 2,
    tableauCount: 10,
    cardsPerColumn: 4,
    acesStartOnFoundations: false,
  },
  [FortyThievesVariant.LUCAS]: {
    occupied: descendingSameSuit,
    grab: { kind: "run", adjacent: isSameSuitRun },
    buriedPerColumn: 0,
    tableauCount: 13,
    cardsPerColumn: 3,
    acesStartOnFoundations: true,
  },
};

/**
 * Returns the rule for a column under a variant: any card starts an empty one,
 * and anything after builds by the variant's rule.
 */
export function fortyThievesTableauRule(
  variant: FortyThievesVariant,
): PlacementRule {
  return byEmptiness(anyCard, VARIANT_RULES[variant].occupied);
}

/** Returns what may be taken from a column under `variant`. */
export function fortyThievesGrabRule(variant: FortyThievesVariant): GrabRule {
  return VARIANT_RULES[variant].grab;
}

/** Returns how many cards of each column `variant` deals face down. */
export function fortyThievesBuriedPerColumn(
  variant: FortyThievesVariant,
): number {
  return VARIANT_RULES[variant].buriedPerColumn;
}

/** Returns whether the variant deals any of its cards face down. */
export function fortyThievesHidesCards(variant: FortyThievesVariant): boolean {
  return VARIANT_RULES[variant].buriedPerColumn > 0;
}

/** Returns how many columns `variant` lays out. */
export function fortyThievesTableauCount(variant: FortyThievesVariant): number {
  return VARIANT_RULES[variant].tableauCount;
}

/** Returns how many cards `variant` deals to each column. */
export function fortyThievesCardsPerColumn(
  variant: FortyThievesVariant,
): number {
  return VARIANT_RULES[variant].cardsPerColumn;
}

/** Returns whether `variant` deals the Aces onto the foundations first. */
export function fortyThievesAcesStartOnFoundations(
  variant: FortyThievesVariant,
): boolean {
  return VARIANT_RULES[variant].acesStartOnFoundations;
}

/**
 * A Forty Thieves foundation: the standard Ace-up-by-suit pile.
 *
 * No foundation belongs to a suit: whichever Ace arrives first claims it.
 */
export const FORTY_THIEVES_FOUNDATION_RULE: PlacementRule = suitFoundation;
