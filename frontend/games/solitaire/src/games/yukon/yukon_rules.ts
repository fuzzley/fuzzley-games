import { PileRole } from "@/engine/core/card/card_pile";
import { Rank } from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  any,
  ascendingSameSuit,
  byEmptiness,
  cardIs,
  descendingAlternatingColor,
  descendingDifferentSuit,
  descendingSameSuit,
  hasRank,
  suitFoundation,
} from "@/engine/tableau/rules";

/** The parts a pile can play in a Yukon game. */
export const YukonRole = {
  /** A suit pile built up from Ace to King. */
  FOUNDATION: "foundation",
  /** A board column, built by whichever rule the variant names. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a Yukon pile can play. */
export type YukonRole = (typeof YukonRole)[keyof typeof YukonRole];

/**
 * Which of the Yukon family is being played.
 *
 * Numbered because the settings panel stores an option as a number, which the
 * catalog hands straight to the game.
 */
export const YukonVariant = {
  /** The original: columns build down in alternating colors. */
  YUKON: 0,
  /** Columns build up *or* down in the same suit. */
  ALASKA: 1,
  /** Columns build down in the same suit. */
  RUSSIAN: 2,
  /** Moosehide: columns build down in any suit but the card's own. */
  MOOSEHIDE: 3,
} as const;

/** Names one of the games in the Yukon family. */
export type YukonVariant = (typeof YukonVariant)[keyof typeof YukonVariant];

/** The variant dealt when nothing says otherwise. */
export const DEFAULT_YUKON_VARIANT: YukonVariant = YukonVariant.YUKON;

/** What an occupied column accepts, per variant. */
const OCCUPIED_COLUMN_RULES: Readonly<Record<YukonVariant, PlacementRule>> = {
  [YukonVariant.YUKON]: descendingAlternatingColor,
  [YukonVariant.ALASKA]: any(ascendingSameSuit, descendingSameSuit),
  [YukonVariant.RUSSIAN]: descendingSameSuit,
  [YukonVariant.MOOSEHIDE]: descendingDifferentSuit,
};

/**
 * Returns the rule for a column under a variant: only a King may start an
 * empty one, and anything after builds by the variant's rule.
 *
 * No stack limit applies, since a stack moves in one piece rather than through
 * spare cells.
 */
export function yukonTableauRule(variant: YukonVariant): PlacementRule {
  return byEmptiness(
    cardIs(hasRank(Rank.KING)),
    OCCUPIED_COLUMN_RULES[variant],
  );
}

/** A Yukon foundation: the standard Ace-up-by-suit pile. */
export const YUKON_FOUNDATION_RULE: PlacementRule = suitFoundation;

/**
 * Returns what a pile of a role accepts under a variant, or null for an
 * unknown role.
 */
export function yukonPlacementRule(
  role: string,
  variant: YukonVariant,
): PlacementRule | null {
  switch (role) {
    case YukonRole.TABLEAU:
      return yukonTableauRule(variant);
    case YukonRole.FOUNDATION:
      return YUKON_FOUNDATION_RULE;
    default:
      return null;
  }
}
