import { PileRole } from "@/engine/core/card/card_pile";
import { PlayingCardId } from "@/engine/core/card/playing_card";
import { PlacementRule, all, singleCardOnly } from "@/engine/tableau/rules";
import { PokerHand, evaluateHand } from "./poker_hands";

/** The parts a pile can play in a game of Poker Squares. */
export const PokerSquaresRole = {
  /** The face-down cards still to come. */
  STOCK: "stock",
  /** The card to place next. */
  HAND: "hand",
  /** One square of the five-by-five grid. */
  CELL: "cell",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a Poker Squares pile can play. */
export type PokerSquaresRole =
  (typeof PokerSquaresRole)[keyof typeof PokerSquaresRole];

/**
 * Which scoring the lines are counted by.
 *
 * Numbered because the settings panel stores an option as a number, which the
 * catalog hands straight to the game.
 */
export const PokerSquaresScoring = {
  /** The American system, where a royal flush scores 100. */
  AMERICAN: 0,
  /** The English system, which rewards a straight above a flush. */
  ENGLISH: 1,
} as const;

/** Names one of the scoring systems. */
export type PokerSquaresScoring =
  (typeof PokerSquaresScoring)[keyof typeof PokerSquaresScoring];

/** The scoring dealt when nothing says otherwise. */
export const DEFAULT_POKER_SQUARES_SCORING: PokerSquaresScoring =
  PokerSquaresScoring.AMERICAN;

/** Says what each hand scores in a system, and what score wins. */
interface ScoringSystem {
  readonly points: Readonly<Record<PokerHand, number>>;
  readonly winningScore: number;
}

const SCORING_SYSTEMS: Readonly<Record<PokerSquaresScoring, ScoringSystem>> = {
  [PokerSquaresScoring.AMERICAN]: {
    points: {
      [PokerHand.NOTHING]: 0,
      [PokerHand.ONE_PAIR]: 2,
      [PokerHand.TWO_PAIR]: 5,
      [PokerHand.THREE_OF_A_KIND]: 10,
      [PokerHand.STRAIGHT]: 15,
      [PokerHand.FLUSH]: 20,
      [PokerHand.FULL_HOUSE]: 25,
      [PokerHand.FOUR_OF_A_KIND]: 50,
      [PokerHand.STRAIGHT_FLUSH]: 75,
      [PokerHand.ROYAL_FLUSH]: 100,
    },
    winningScore: 200,
  },
  [PokerSquaresScoring.ENGLISH]: {
    points: {
      [PokerHand.NOTHING]: 0,
      [PokerHand.ONE_PAIR]: 1,
      [PokerHand.TWO_PAIR]: 3,
      [PokerHand.THREE_OF_A_KIND]: 6,
      [PokerHand.STRAIGHT]: 12,
      [PokerHand.FLUSH]: 5,
      [PokerHand.FULL_HOUSE]: 10,
      [PokerHand.FOUR_OF_A_KIND]: 16,
      [PokerHand.STRAIGHT_FLUSH]: 30,
      [PokerHand.ROYAL_FLUSH]: 30,
    },
    winningScore: 70,
  },
};

/** Returns the score that wins a game under a scoring system. */
export function winningScore(scoring: PokerSquaresScoring): number {
  return SCORING_SYSTEMS[scoring].winningScore;
}

/**
 * Returns what the grid scores: each row and each column scored as the poker
 * hand its cards make so far.
 *
 * @param lines The grid's rows and columns, each holding the cards in it.
 */
export function scoreGrid(
  lines: readonly (readonly PlayingCardId[])[],
  scoring: PokerSquaresScoring,
): number {
  const { points } = SCORING_SYSTEMS[scoring];
  return lines.reduce((total, line) => total + points[evaluateHand(line)], 0);
}

/** A square: takes the card in the hand, once, and keeps it. */
export const SQUARE_RULE: PlacementRule = all(
  singleCardOnly,
  (context) => context.sourcePile.role === PokerSquaresRole.HAND,
);
