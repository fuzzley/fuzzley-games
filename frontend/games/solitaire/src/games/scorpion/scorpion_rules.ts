import { PileRole } from "@/engine/core/card/card_pile";
import { Rank } from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  anyCard,
  byEmptiness,
  cardIs,
  hasRank,
} from "@/engine/tableau/rules/placement";
import { descendingSameSuit } from "@/engine/tableau/rules/builds";

/** The parts a pile can play in a Scorpion game. */
export const ScorpionRole = {
  /** The three-card pile that deals itself out in one press. */
  STOCK: "stock",
  /** Where a completed King-to-Ace run goes. */
  FOUNDATION: "foundation",
  /** A board column built down in the same suit. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a Scorpion pile can play. */
export type ScorpionRole = (typeof ScorpionRole)[keyof typeof ScorpionRole];

/** Which of the Scorpion family is being played. */
export const ScorpionVariant = {
  /** The original: Kings into spaces, four columns hiding three cards each. */
  SCORPION: "scorpion",
  /** Wasp: any card or run may fill a space. */
  WASP: "wasp",
  /** Scorpion II: only the first three columns hide cards. */
  SCORPION_II: "scorpion-ii",
} as const;

/** Names one of the games in the Scorpion family. */
export type ScorpionVariant =
  (typeof ScorpionVariant)[keyof typeof ScorpionVariant];

/** The variant dealt when nothing says otherwise. */
export const DEFAULT_SCORPION_VARIANT: ScorpionVariant =
  ScorpionVariant.SCORPION;

/** Holds everything a variant decides. */
interface VariantRules {
  /** What an empty column accepts. */
  readonly whenEmpty: PlacementRule;
  /** How many columns, from the left, the deal buries cards in. */
  readonly hiddenColumnCount: number;
}

/** What each variant changes. */
const VARIANT_RULES: Readonly<Record<ScorpionVariant, VariantRules>> = {
  [ScorpionVariant.SCORPION]: {
    whenEmpty: cardIs(hasRank(Rank.KING)),
    hiddenColumnCount: 4,
  },
  [ScorpionVariant.WASP]: {
    whenEmpty: anyCard,
    hiddenColumnCount: 4,
  },
  [ScorpionVariant.SCORPION_II]: {
    whenEmpty: cardIs(hasRank(Rank.KING)),
    hiddenColumnCount: 3,
  },
};

/**
 * Returns the rule for a column under a variant: the variant decides what
 * starts an empty one, and anything after builds down by rank in the same
 * suit.
 */
export function scorpionTableauRule(variant: ScorpionVariant): PlacementRule {
  return byEmptiness(VARIANT_RULES[variant].whenEmpty, descendingSameSuit);
}

/** Returns how many columns, from the left, `variant` buries cards in. */
export function scorpionHiddenColumnCount(variant: ScorpionVariant): number {
  return VARIANT_RULES[variant].hiddenColumnCount;
}
