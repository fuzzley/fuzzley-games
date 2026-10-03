import { PileRole } from "@/engine/core/card/card_pile";
import { itemAt } from "@/engine/core/common/item_at";
import {
  ALL_RANKS,
  PlayingCardId,
  Rank,
  Suit,
} from "@/engine/core/card/playing_card";
import {
  PlacementRule,
  all,
  anyCard,
  ascendingSameSuitWrapping,
  byEmptiness,
  descendingAnySuit,
  singleCardOnly,
} from "@/engine/tableau/rules";

/** The parts a pile can play in a game of Grandfather's Clock. */
export const ClockRole = {
  /** One of the twelve foundations round the dial. */
  FOUNDATION: "foundation",
  /** A column built down regardless of suit. */
  TABLEAU: "tableau",
} as const satisfies Record<string, PileRole>;

/** Names one of the parts a Grandfather's Clock pile can play. */
export type ClockRole = (typeof ClockRole)[keyof typeof ClockRole];

/** The suits the dial's cards take in turn, as PySol lays them. */
const DIAL_SUITS: readonly Suit[] = [
  Suit.SPADE,
  Suit.HEART,
  Suit.CLUB,
  Suit.DIAMOND,
];

/** Describes one foundation of the dial. */
export interface DialPosition {
  /** The hour it stands at, one to twelve. */
  readonly hour: number;
  /** The card the deal starts it with. */
  readonly start: PlayingCardId;
  /** How many cards it holds once it reaches its hour. */
  readonly capacity: number;
}

/**
 * The twelve foundations, in the order the deal starts them: the Two of
 * Spades at five o'clock, then each hour clockwise one rank higher, the suits
 * taken in turn, to the King of Diamonds at four o'clock.
 *
 * Each builds up in suit round the corner until its top card's rank is its
 * hour, the Jack counting eleven and the Queen twelve, which a `capacity`
 * enforces: a foundation from five to twelve o'clock takes three more cards,
 * one from one to four o'clock four more.
 */
export const DIAL: readonly DialPosition[] = Array.from(
  { length: 12 },
  (_, index) => {
    const hour = ((index + 4) % 12) + 1;
    const startRank: Rank = Rank.TWO + index;
    const endRank: Rank = hour - 1;
    return {
      hour,
      start: {
        suit: itemAt(DIAL_SUITS, index % DIAL_SUITS.length),
        rank: startRank,
      },
      capacity:
        ((endRank - startRank + ALL_RANKS.length) % ALL_RANKS.length) + 1,
    };
  },
);

/** A dial foundation: up in suit from its starting card, round the corner. */
export const CLOCK_FOUNDATION_RULE: PlacementRule = all(
  singleCardOnly,
  ascendingSameSuitWrapping,
);

/** A column: any card fills a space, and it builds down in any suit. */
export const CLOCK_TABLEAU_RULE: PlacementRule = byEmptiness(
  anyCard,
  descendingAnySuit,
);
