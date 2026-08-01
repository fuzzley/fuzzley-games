import { PileRole } from "@/engine/core/card/card_pile";
import { Rank } from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  any,
  ascendingSameSuit,
  byEmptiness,
  cardIs,
  descendingAlternatingColor,
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

/** One of the parts a Yukon pile can play. */
export type YukonRole = (typeof YukonRole)[keyof typeof YukonRole];

/**
 * Which of the Yukon family is being played.
 *
 * Numbered rather than named because the settings panel stores an option as a
 * number: making the variant those numbers lets the catalog hand its choice
 * straight to the game, instead of keeping a translation table that could drift
 * from the choices it offers.
 */
export const YukonVariant = {
  /** The original: columns build down in alternating colors. */
  YUKON: 0,
  /** Columns build up *or* down in the same suit. */
  ALASKA: 1,
  /** Columns build down in the same suit. */
  RUSSIAN: 2,
} as const;

/** One of the three games in the Yukon family. */
export type YukonVariant = (typeof YukonVariant)[keyof typeof YukonVariant];

/** The variant dealt when nothing says otherwise. */
export const DEFAULT_YUKON_VARIANT: YukonVariant = YukonVariant.YUKON;

/**
 * What an occupied column accepts, per variant.
 *
 * The single thing the three games disagree about — they share a deal, a grab
 * rule, an empty-column rule and a foundation — so the difference is a table of
 * three rules rather than three modules.
 *
 * Alaska is genuinely up *or* down in suit, which is what separates it from
 * Russian Solitaire: an Alaska column will take the Nine of Spades on either
 * the Eight or the Ten of Spades, and that extra direction is the whole of its
 * reputation as the gentler of the two.
 */
const OCCUPIED_COLUMN_RULES: Readonly<Record<YukonVariant, PlacementRule>> = {
  [YukonVariant.YUKON]: descendingAlternatingColor,
  [YukonVariant.ALASKA]: any(ascendingSameSuit, descendingSameSuit),
  [YukonVariant.RUSSIAN]: descendingSameSuit,
};

/**
 * A column of the given variant: only a King may start an empty one, and
 * anything after builds by the variant's rule.
 *
 * Nothing here limits how many cards may land at once. It does not need to: a
 * Yukon stack is carried in one piece rather than shuffled through spare
 * squares the way a FreeCell supermove is, so there is no staging capacity to
 * run out of.
 *
 * @param variant Which of the three games is being played.
 */
export function yukonTableauRule(variant: YukonVariant): PlacementRule {
  return byEmptiness(
    cardIs(hasRank(Rank.KING)),
    OCCUPIED_COLUMN_RULES[variant],
  );
}

/** A Yukon foundation: the standard Ace-up-by-suit pile, one card at a time. */
export const YUKON_FOUNDATION_RULE: PlacementRule = suitFoundation;

/**
 * The rule governing what a pile of the given role accepts, or null for a role
 * that is never a destination.
 *
 * Both roles are destinations, which is the same observation FreeCell makes:
 * the Yukon family has no stock and no waste, so there is no pile a drag should
 * offer and then refuse.
 *
 * @param role The part the pile plays.
 * @param variant Which of the three games is being played.
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
