import { Card } from "./card";

/** A playing card that tracks its suit, rank, and other state properties. */
export class PlayingCard implements Card {
  /**
   * Constructs a fully-initialized playing card.
   *
   * Identity (id, suit, rank) is fixed at construction so a card can never
   * exist in a half-built state; only {@link faceUp} changes over its lifetime.
   *
   * @param id The canonical card id string (see {@link playingCardIdToString}).
   * @param suit The suit of this card.
   * @param rank The face value rank of this card.
   * @param faceUp Whether the card starts face up. Defaults to face down.
   */
  constructor(
    public readonly id: string,
    public readonly suit: Suit,
    public readonly rank: Rank,
    public faceUp = false,
  ) {}
}

/** Describes the standard suits that a playing card can have. */
export enum Suit {
  /** Spade suit. */
  SPADE,
  /** Heart suit. */
  HEART,
  /** Diamond suit. */
  DIAMOND,
  /** Club suit. */
  CLUB,
}

/**
 * Describes the standard ranks that a playing card can have.
 *
 * The members are ordered and consecutive, so the Klondike build rules compare
 * them arithmetically: `ACE + 1` is `TWO`.
 */
export enum Rank {
  /** Ace. */
  ACE,
  /** Two. */
  TWO,
  /** Three. */
  THREE,
  /** Four. */
  FOUR,
  /** Five. */
  FIVE,
  /** Six. */
  SIX,
  /** Seven. */
  SEVEN,
  /** Eight. */
  EIGHT,
  /** Nine. */
  NINE,
  /** Ten. */
  TEN,
  /** Jack. */
  JACK,
  /** Queen. */
  QUEEN,
  /** King. */
  KING,
}

/** Represents the identification properties of a playing card. */
export interface PlayingCardId {
  /** The suit of the card. */
  suit: Suit;
  /** The face value/rank of the card. */
  rank: Rank;
}

/** Every suit, in the order foundations are laid out. */
export const ALL_SUITS: readonly Suit[] = [
  Suit.SPADE,
  Suit.HEART,
  Suit.DIAMOND,
  Suit.CLUB,
];

/** Every rank, in ascending order from Ace to King. */
export const ALL_RANKS: readonly Rank[] = [
  Rank.ACE,
  Rank.TWO,
  Rank.THREE,
  Rank.FOUR,
  Rank.FIVE,
  Rank.SIX,
  Rank.SEVEN,
  Rank.EIGHT,
  Rank.NINE,
  Rank.TEN,
  Rank.JACK,
  Rank.QUEEN,
  Rank.KING,
];

/**
 * A complete list of all 52 standard playing card identities, suit-major.
 *
 * Derived from {@link ALL_SUITS} and {@link ALL_RANKS} rather than listed, so a
 * deck can never drift out of sync with the enums that define it.
 */
export const ALL_PLAYING_CARD_IDS: ReadonlyArray<PlayingCardId> =
  ALL_SUITS.flatMap((suit) => ALL_RANKS.map((rank) => ({ suit, rank })));

/**
 * The rank one step above `rank`, or undefined for the King.
 *
 * Klondike builds by consecutive rank in both directions. Stepping through
 * these helpers rather than doing arithmetic at the call site keeps rank
 * comparisons enum-to-enum, and says what the step means.
 */
export function rankAbove(rank: Rank): Rank | undefined {
  return rank === Rank.KING ? undefined : rank + 1;
}

/** The rank one step below `rank`, or undefined for the Ace. */
export function rankBelow(rank: Rank): Rank | undefined {
  return rank === Rank.ACE ? undefined : rank - 1;
}

/**
 * Produces the canonical string identity for a card, e.g. `card-hearts-queen`.
 *
 * This is the single source of truth for card id strings: the logical model
 * uses it to name cards, and the render layer reuses it to resolve texture
 * atlas frames, so the two can never drift apart.
 *
 * @param cardId The suit and rank of the card.
 * @returns The canonical `card-<suit>-<rank>` identity string.
 */
export function playingCardIdToString(cardId: PlayingCardId): string {
  return `card-${suitToString(cardId.suit)}-${rankToString(cardId.rank)}`;
}

const SUIT_STRINGS: Record<Suit, string> = {
  [Suit.SPADE]: "spades",
  [Suit.HEART]: "hearts",
  [Suit.DIAMOND]: "diamonds",
  [Suit.CLUB]: "clubs",
};

const RANK_STRINGS: Record<Rank, string> = {
  [Rank.ACE]: "ace",
  [Rank.TWO]: "2",
  [Rank.THREE]: "3",
  [Rank.FOUR]: "4",
  [Rank.FIVE]: "5",
  [Rank.SIX]: "6",
  [Rank.SEVEN]: "7",
  [Rank.EIGHT]: "8",
  [Rank.NINE]: "9",
  [Rank.TEN]: "10",
  [Rank.JACK]: "jack",
  [Rank.QUEEN]: "queen",
  [Rank.KING]: "king",
};

function suitToString(suit: Suit): string {
  const value = SUIT_STRINGS[suit];
  if (value === undefined) {
    throw new Error(`Unknown Suit: ${String(suit)}`);
  }
  return value;
}

function rankToString(rank: Rank): string {
  const value = RANK_STRINGS[rank];
  if (value === undefined) {
    throw new Error(`Unknown Rank: ${String(rank)}`);
  }
  return value;
}
