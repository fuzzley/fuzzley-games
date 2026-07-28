import { Card } from "./card";

/** A playing card that tracks its suit, rank, and other state properties. */
export class PlayingCard implements Card {
  /**
   * Constructs a fully-initialized playing card.
   *
   * Identity (id, faceKey, suit, rank) is fixed at construction so a card can
   * never exist in a half-built state; only {@link faceUp} changes over its
   * lifetime.
   *
   * @param id The card's unique instance id (see {@link playingCardInstanceId}).
   * @param suit The suit of this card.
   * @param rank The face value rank of this card.
   * @param faceUp Whether the card starts face up. Defaults to face down.
   * @param faceKey The artwork key for this card's face. Defaults to the key
   *   its own suit and rank name, which is what every real card wants; it is a
   *   parameter only so a caller that has already computed it need not pay for
   *   it twice.
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

/**
 * A playing card identity in a game that may deal more than one deck.
 *
 * A {@link PlayingCardId} says which card this is to look at; the deck index
 * says which copy of it, so two-deck Spider can tell its two Queens of Hearts
 * apart while still drawing them with the same artwork.
 */
export interface DeckCardId extends PlayingCardId {
  /**
   * Which copy of the deck this card belongs to, counting from zero. Optional,
   * and zero when omitted: a single-deck game has no copies to tell apart and
   * should not have to say so.
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
 * Produces the artwork key for a card's face, e.g. `card-hearts-queen`.
 *
 * The single source of truth for what a card looks like: the render layer
 * resolves texture atlas frames through this, so the artwork a card is drawn
 * with can never drift from the suit and rank it claims. Every copy of a card
 * shares one, which is the point — a game holding two decks draws both of its
 * Queens of Hearts from the same frame.
 *
 * @param cardId The suit and rank of the card.
 * @returns The canonical `card-<suit>-<rank>` artwork key.
 */
export function playingCardFaceKey(cardId: PlayingCardId): string {
  return `card-${suitToString(cardId.suit)}-${rankToString(cardId.rank)}`;
}

/**
 * Produces the unique instance id for one card of one deck.
 *
 * Deck zero's cards are named by their face key alone, so a single-deck game —
 * which is every game until one deals two — has ids identical to its artwork
 * keys, and nothing has to think about copies that do not exist. Later decks
 * are suffixed.
 *
 * @param cardId The suit, rank and deck index of the card.
 * @returns The card's unique instance id.
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
