import { PileRole } from "@/engine/core/card/card_pile";
import { Rank } from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  anyCard,
  byEmptiness,
  cardIs,
  descendingAlternatingColor,
  descendingDifferentSuit,
  descendingSameColor,
  hasRank,
  isDifferentSuitRun,
  isOrderedPair,
  isSameColorRun,
  suitFoundation,
} from "@/engine/tableau/rules";
import { GrabRule } from "@/engine/tableau/zone";

/** The parts a pile can play in a Klondike game. */
export const KlondikeRole = {
  /** The face-down draw pile. */
  STOCK: "stock",
  /** The face-up pile of drawn cards. */
  WASTE: "waste",
  /** A suit pile built up from Ace to King. */
  FOUNDATION: "foundation",
  /** A board column built down in alternating colors. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a Klondike pile can play. */
export type KlondikeRole = (typeof KlondikeRole)[keyof typeof KlondikeRole];

/**
 * Which set of column rules a Klondike board is played by.
 *
 * Numbered because the settings panel stores an option as a number, which the
 * catalog hands straight to the game.
 */
export const KlondikeVariant = {
  /** The original: build down in alternating colours, Kings into spaces. */
  KLONDIKE: 0,
  /** Whitehead: build down in colour, all face up, any card into a space. */
  WHITEHEAD: 1,
  /** Thumb and Pouch: build down in any other suit, any card into a space. */
  THUMB_AND_POUCH: 2,
  /** Saratoga: the original, with every column card dealt face up. */
  SARATOGA: 3,
} as const;

/** Names one of the games in the Klondike family. */
export type KlondikeVariant =
  (typeof KlondikeVariant)[keyof typeof KlondikeVariant];

/** The variant dealt when nothing says otherwise. */
export const DEFAULT_KLONDIKE_VARIANT: KlondikeVariant =
  KlondikeVariant.KLONDIKE;

/** Says how many cards a draw turns over. */
export type DrawCount = 1 | 3;

/** The draw mode a game is dealt in when nothing says otherwise. */
export const DEFAULT_DRAW_COUNT: DrawCount = 3;

/** Holds everything a variant decides, which has to hang together. */
interface VariantRules {
  /** What an empty column accepts. */
  readonly whenEmpty: PlacementRule;
  /** What an occupied column accepts. */
  readonly occupied: PlacementRule;
  /** What may be taken from a column. */
  readonly grab: GrabRule;
  /** Whether the deal shows every card rather than burying most of them. */
  readonly dealsFaceUp: boolean;
}

/**
 * What each variant changes, in one table so each build rule sits beside the
 * grab rule it has to agree with.
 *
 * Klondike deliberately takes `any-face-up` rather than a run: a column gives
 * up a broken pile as long as its bottom card fits where it lands. Saratoga
 * cannot, because with every card face up that would lift unordered piles as
 * Yukon does.
 */
const VARIANT_RULES: Readonly<Record<KlondikeVariant, VariantRules>> = {
  [KlondikeVariant.KLONDIKE]: {
    whenEmpty: cardIs(hasRank(Rank.KING)),
    occupied: descendingAlternatingColor,
    grab: { kind: "any-face-up" },
    dealsFaceUp: false,
  },
  [KlondikeVariant.WHITEHEAD]: {
    whenEmpty: anyCard,
    occupied: descendingSameColor,
    grab: { kind: "run", adjacent: isSameColorRun },
    dealsFaceUp: true,
  },
  [KlondikeVariant.THUMB_AND_POUCH]: {
    whenEmpty: anyCard,
    occupied: descendingDifferentSuit,
    grab: { kind: "run", adjacent: isDifferentSuitRun },
    dealsFaceUp: false,
  },
  [KlondikeVariant.SARATOGA]: {
    whenEmpty: cardIs(hasRank(Rank.KING)),
    occupied: descendingAlternatingColor,
    grab: { kind: "run", adjacent: isOrderedPair },
    dealsFaceUp: true,
  },
};

/** Returns the rule for a Klondike tableau column under a variant. */
export function klondikeTableauRule(
  variant: KlondikeVariant = DEFAULT_KLONDIKE_VARIANT,
): PlacementRule {
  const rules = VARIANT_RULES[variant];
  return byEmptiness(rules.whenEmpty, rules.occupied);
}

/** Returns what may be taken from a column under `variant`. */
export function klondikeGrabRule(
  variant: KlondikeVariant = DEFAULT_KLONDIKE_VARIANT,
): GrabRule {
  return VARIANT_RULES[variant].grab;
}

/** Returns whether `variant` deals its whole board face up. */
export function klondikeDealsFaceUp(variant: KlondikeVariant): boolean {
  return VARIANT_RULES[variant].dealsFaceUp;
}

/** A Klondike foundation: the standard Ace-up-by-suit pile. */
export const KLONDIKE_FOUNDATION_RULE: PlacementRule = suitFoundation;
