import { Card } from "./card";

/** Represents a playing card with a suit and a rank. */
export class PlayingCard implements Card {
  /**
   * Creates a card whose identity is fixed; only {@link faceUp} can change.
   *
   * @param id The unique instance id from {@link playingCardInstanceId}.
   * @param faceKey The artwork key for the card's face, if already computed
   *   from its suit and rank.
   */
  constructor(
    public readonly id: string,
    public readonly suit: Suit,
    public readonly rank: Rank,
    public faceUp = false,
    public readonly faceKey: string = playingCardFaceKey({ suit, rank }),
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
 * The members are ordered and consecutive, so rules compare them
 * arithmetically: `ACE + 1` is `TWO`.
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

/** Identifies a playing card by its suit and rank. */
export interface PlayingCardId {
  /** The suit of the card. */
  suit: Suit;
  /** The rank of the card. */
  rank: Rank;
}

/** Identifies one copy of a playing card in a game that may deal many decks. */
export interface DeckCardId extends PlayingCardId {
  /**
   * Which copy of the deck this card belongs to, counting from zero; omitted
   * means zero.
   */
  deckIndex?: number;
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

/** Returns the rank one step above `rank`, or undefined for the King. */
export function rankAbove(rank: Rank): Rank | undefined {
  return rank === Rank.KING ? undefined : rank + 1;
}

/** Returns the rank one step below `rank`, or undefined for the Ace. */
export function rankBelow(rank: Rank): Rank | undefined {
  return rank === Rank.ACE ? undefined : rank - 1;
}

/** Returns the rank one step above `rank`, turning the corner from King to Ace. */
export function rankAboveWrapping(rank: Rank): Rank {
  return rank === Rank.KING ? Rank.ACE : rank + 1;
}

/** Returns the rank one step below `rank`, turning the corner from Ace to King. */
export function rankBelowWrapping(rank: Rank): Rank {
  return rank === Rank.ACE ? Rank.KING : rank - 1;
}

/**
 * Produces the artwork key for a card's face, e.g. `card-hearts-queen`.
 *
 * The texture atlas names its frames with these keys, so the two must change
 * together.
 */
export function playingCardFaceKey(cardId: PlayingCardId): string {
  return `card-${suitToString(cardId.suit)}-${rankToString(cardId.rank)}`;
}

/**
 * Produces the unique instance id for one card of one deck, which for the first
 * deck is its face key.
 */
export function playingCardInstanceId(cardId: DeckCardId): string {
  const faceKey = playingCardFaceKey(cardId);
  const deckIndex = cardId.deckIndex ?? 0;
  return deckIndex === 0 ? faceKey : `${faceKey}#${deckIndex}`;
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
