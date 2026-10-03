import { PileRole } from "@/engine/core/card/card_pile";
import { Rank } from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  all,
  anyCard,
  buildsOn,
  byEmptiness,
  isAdjacentRank,
  singleCardOnly,
} from "@/engine/tableau/rules";

/** The parts a pile can play in a Golf game. */
export const GolfRole = {
  /** The face-down cards turned onto the foundation when play is stuck. */
  STOCK: "stock",
  /** The single pile every card is played onto, which is also the waste. */
  FOUNDATION: "foundation",
  /** A column whose top card may be played. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a Golf pile can play. */
export type GolfRole = (typeof GolfRole)[keyof typeof GolfRole];

/**
 * Which of the Golf family is being played.
 *
 * Numbered because the settings panel stores an option as a number, which the
 * catalog hands straight to the game.
 */
export const GolfVariant = {
  /** The original: nothing may be played on a King. */
  GOLF: 0,
  /** A Queen may be played on a King, but still not an Ace. */
  QUEENS_ON_KINGS: 1,
  /** Putt Putt: the ranks turn the corner, so Ace and King are adjacent. */
  PUTT_PUTT: 2,
} as const;

/** Names one of the games in the Golf family. */
export type GolfVariant = (typeof GolfVariant)[keyof typeof GolfVariant];

/** The variant dealt when nothing says otherwise. */
export const DEFAULT_GOLF_VARIANT: GolfVariant = GolfVariant.GOLF;

/** Says how a variant's foundation treats a King. */
interface GolfVariantRules {
  /** Whether Ace and King are one rank apart. */
  readonly wraps: boolean;
  /** Whether a King on the foundation takes nothing at all. */
  readonly kingBlocks: boolean;
}

const VARIANT_RULES: Readonly<Record<GolfVariant, GolfVariantRules>> = {
  [GolfVariant.GOLF]: { wraps: false, kingBlocks: true },
  [GolfVariant.QUEENS_ON_KINGS]: { wraps: false, kingBlocks: false },
  [GolfVariant.PUTT_PUTT]: { wraps: true, kingBlocks: false },
};

/**
 * Returns the foundation's rule under a variant: one card, one rank above or
 * below the top card in any suit.
 *
 * Empty only in a short deck that ran out before reaching it, when any card may
 * start it.
 */
export function golfFoundationRule(variant: GolfVariant): PlacementRule {
  const { wraps, kingBlocks } = VARIANT_RULES[variant];
  const adjacent = isAdjacentRank(wraps);
  return all(
    singleCardOnly,
    byEmptiness(
      anyCard,
      buildsOn(
        (lower, upper) =>
          !(kingBlocks && lower.rank === Rank.KING) && adjacent(lower, upper),
      ),
    ),
  );
}
