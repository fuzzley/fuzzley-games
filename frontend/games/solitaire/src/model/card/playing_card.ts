import { Card } from "./card";

/** A playing card that tracks its suit, type, and other state properties. */
export class PlayingCard implements Card {
  /** @override */
  public id: string;
  /** @override */
  public faceUp: boolean;
  /** The suit of this card. */
  public suite: Suit;
  /** The face value rank of this card. */
  public type: Type;
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

/** Describes the standard types (ranks) that a playing card can have. */
export enum Type {
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
  type: Type;
}

// Spades
/** Card identity constant for the Spade Ace. */
export const SPADE_ACE_ID: PlayingCardId = {
  suit: Suit.SPADE,
  type: Type.ACE,
};
/** Card identity constant for the Spade Two. */
export const SPADE_TWO_ID: PlayingCardId = {
  suit: Suit.SPADE,
  type: Type.TWO,
};
/** Card identity constant for the Spade Three. */
export const SPADE_THREE_ID: PlayingCardId = {
  suit: Suit.SPADE,
  type: Type.THREE,
};
/** Card identity constant for the Spade Four. */
export const SPADE_FOUR_ID: PlayingCardId = {
  suit: Suit.SPADE,
  type: Type.FOUR,
};
/** Card identity constant for the Spade Five. */
export const SPADE_FIVE_ID: PlayingCardId = {
  suit: Suit.SPADE,
  type: Type.FIVE,
};
/** Card identity constant for the Spade Six. */
export const SPADE_SIX_ID: PlayingCardId = {
  suit: Suit.SPADE,
  type: Type.SIX,
};
/** Card identity constant for the Spade Seven. */
export const SPADE_SEVEN_ID: PlayingCardId = {
  suit: Suit.SPADE,
  type: Type.SEVEN,
};
/** Card identity constant for the Spade Eight. */
export const SPADE_EIGHT_ID: PlayingCardId = {
  suit: Suit.SPADE,
  type: Type.EIGHT,
};
/** Card identity constant for the Spade Nine. */
export const SPADE_NINE_ID: PlayingCardId = {
  suit: Suit.SPADE,
  type: Type.NINE,
};
/** Card identity constant for the Spade Ten. */
export const SPADE_TEN_ID: PlayingCardId = {
  suit: Suit.SPADE,
  type: Type.TEN,
};
/** Card identity constant for the Spade Jack. */
export const SPADE_JACK_ID: PlayingCardId = {
  suit: Suit.SPADE,
  type: Type.JACK,
};
/** Card identity constant for the Spade Queen. */
export const SPADE_QUEEN_ID: PlayingCardId = {
  suit: Suit.SPADE,
  type: Type.QUEEN,
};
/** Card identity constant for the Spade King. */
export const SPADE_KING_ID: PlayingCardId = {
  suit: Suit.SPADE,
  type: Type.KING,
};

// Hearts
/** Card identity constant for the Heart Ace. */
export const HEART_ACE_ID: PlayingCardId = {
  suit: Suit.HEART,
  type: Type.ACE,
};
/** Card identity constant for the Heart Two. */
export const HEART_TWO_ID: PlayingCardId = {
  suit: Suit.HEART,
  type: Type.TWO,
};
/** Card identity constant for the Heart Three. */
export const HEART_THREE_ID: PlayingCardId = {
  suit: Suit.HEART,
  type: Type.THREE,
};
/** Card identity constant for the Heart Four. */
export const HEART_FOUR_ID: PlayingCardId = {
  suit: Suit.HEART,
  type: Type.FOUR,
};
/** Card identity constant for the Heart Five. */
export const HEART_FIVE_ID: PlayingCardId = {
  suit: Suit.HEART,
  type: Type.FIVE,
};
/** Card identity constant for the Heart Six. */
export const HEART_SIX_ID: PlayingCardId = {
  suit: Suit.HEART,
  type: Type.SIX,
};
/** Card identity constant for the Heart Seven. */
export const HEART_SEVEN_ID: PlayingCardId = {
  suit: Suit.HEART,
  type: Type.SEVEN,
};
/** Card identity constant for the Heart Eight. */
export const HEART_EIGHT_ID: PlayingCardId = {
  suit: Suit.HEART,
  type: Type.EIGHT,
};
/** Card identity constant for the Heart Nine. */
export const HEART_NINE_ID: PlayingCardId = {
  suit: Suit.HEART,
  type: Type.NINE,
};
/** Card identity constant for the Heart Ten. */
export const HEART_TEN_ID: PlayingCardId = {
  suit: Suit.HEART,
  type: Type.TEN,
};
/** Card identity constant for the Heart Jack. */
export const HEART_JACK_ID: PlayingCardId = {
  suit: Suit.HEART,
  type: Type.JACK,
};
/** Card identity constant for the Heart Queen. */
export const HEART_QUEEN_ID: PlayingCardId = {
  suit: Suit.HEART,
  type: Type.QUEEN,
};
/** Card identity constant for the Heart King. */
export const HEART_KING_ID: PlayingCardId = {
  suit: Suit.HEART,
  type: Type.KING,
};

// Diamonds
/** Card identity constant for the Diamond Ace. */
export const DIAMOND_ACE_ID: PlayingCardId = {
  suit: Suit.DIAMOND,
  type: Type.ACE,
};
/** Card identity constant for the Diamond Two. */
export const DIAMOND_TWO_ID: PlayingCardId = {
  suit: Suit.DIAMOND,
  type: Type.TWO,
};
/** Card identity constant for the Diamond Three. */
export const DIAMOND_THREE_ID: PlayingCardId = {
  suit: Suit.DIAMOND,
  type: Type.THREE,
};
/** Card identity constant for the Diamond Four. */
export const DIAMOND_FOUR_ID: PlayingCardId = {
  suit: Suit.DIAMOND,
  type: Type.FOUR,
};
/** Card identity constant for the Diamond Five. */
export const DIAMOND_FIVE_ID: PlayingCardId = {
  suit: Suit.DIAMOND,
  type: Type.FIVE,
};
/** Card identity constant for the Diamond Six. */
export const DIAMOND_SIX_ID: PlayingCardId = {
  suit: Suit.DIAMOND,
  type: Type.SIX,
};
/** Card identity constant for the Diamond Seven. */
export const DIAMOND_SEVEN_ID: PlayingCardId = {
  suit: Suit.DIAMOND,
  type: Type.SEVEN,
};
/** Card identity constant for the Diamond Eight. */
export const DIAMOND_EIGHT_ID: PlayingCardId = {
  suit: Suit.DIAMOND,
  type: Type.EIGHT,
};
/** Card identity constant for the Diamond Nine. */
export const DIAMOND_NINE_ID: PlayingCardId = {
  suit: Suit.DIAMOND,
  type: Type.NINE,
};
/** Card identity constant for the Diamond Ten. */
export const DIAMOND_TEN_ID: PlayingCardId = {
  suit: Suit.DIAMOND,
  type: Type.TEN,
};
/** Card identity constant for the Diamond Jack. */
export const DIAMOND_JACK_ID: PlayingCardId = {
  suit: Suit.DIAMOND,
  type: Type.JACK,
};
/** Card identity constant for the Diamond Queen. */
export const DIAMOND_QUEEN_ID: PlayingCardId = {
  suit: Suit.DIAMOND,
  type: Type.QUEEN,
};
/** Card identity constant for the Diamond King. */
export const DIAMOND_KING_ID: PlayingCardId = {
  suit: Suit.DIAMOND,
  type: Type.KING,
};

// Clubs
/** Card identity constant for the Club Ace. */
export const CLUB_ACE_ID: PlayingCardId = {
  suit: Suit.CLUB,
  type: Type.ACE,
};
/** Card identity constant for the Club Two. */
export const CLUB_TWO_ID: PlayingCardId = {
  suit: Suit.CLUB,
  type: Type.TWO,
};
/** Card identity constant for the Club Three. */
export const CLUB_THREE_ID: PlayingCardId = {
  suit: Suit.CLUB,
  type: Type.THREE,
};
/** Card identity constant for the Club Four. */
export const CLUB_FOUR_ID: PlayingCardId = {
  suit: Suit.CLUB,
  type: Type.FOUR,
};
/** Card identity constant for the Club Five. */
export const CLUB_FIVE_ID: PlayingCardId = {
  suit: Suit.CLUB,
  type: Type.FIVE,
};
/** Card identity constant for the Club Six. */
export const CLUB_SIX_ID: PlayingCardId = {
  suit: Suit.CLUB,
  type: Type.SIX,
};
/** Card identity constant for the Club Seven. */
export const CLUB_SEVEN_ID: PlayingCardId = {
  suit: Suit.CLUB,
  type: Type.SEVEN,
};
/** Card identity constant for the Club Eight. */
export const CLUB_EIGHT_ID: PlayingCardId = {
  suit: Suit.CLUB,
  type: Type.EIGHT,
};
/** Card identity constant for the Club Nine. */
export const CLUB_NINE_ID: PlayingCardId = {
  suit: Suit.CLUB,
  type: Type.NINE,
};
/** Card identity constant for the Club Ten. */
export const CLUB_TEN_ID: PlayingCardId = {
  suit: Suit.CLUB,
  type: Type.TEN,
};
/** Card identity constant for the Club Jack. */
export const CLUB_JACK_ID: PlayingCardId = {
  suit: Suit.CLUB,
  type: Type.JACK,
};
/** Card identity constant for the Club Queen. */
export const CLUB_QUEEN_ID: PlayingCardId = {
  suit: Suit.CLUB,
  type: Type.QUEEN,
};
/** Card identity constant for the Club King. */
export const CLUB_KING_ID: PlayingCardId = {
  suit: Suit.CLUB,
  type: Type.KING,
};

/** A complete list of all 52 standard playing card identities. */
export const ALL_PLAYING_CARD_IDS: PlayingCardId[] = [
  // Spade
  SPADE_ACE_ID,
  SPADE_TWO_ID,
  SPADE_THREE_ID,
  SPADE_FOUR_ID,
  SPADE_FIVE_ID,
  SPADE_SIX_ID,
  SPADE_SEVEN_ID,
  SPADE_EIGHT_ID,
  SPADE_NINE_ID,
  SPADE_TEN_ID,
  SPADE_JACK_ID,
  SPADE_QUEEN_ID,
  SPADE_KING_ID,
  // Heart
  HEART_ACE_ID,
  HEART_TWO_ID,
  HEART_THREE_ID,
  HEART_FOUR_ID,
  HEART_FIVE_ID,
  HEART_SIX_ID,
  HEART_SEVEN_ID,
  HEART_EIGHT_ID,
  HEART_NINE_ID,
  HEART_TEN_ID,
  HEART_JACK_ID,
  HEART_QUEEN_ID,
  HEART_KING_ID,
  // Diamond
  DIAMOND_ACE_ID,
  DIAMOND_TWO_ID,
  DIAMOND_THREE_ID,
  DIAMOND_FOUR_ID,
  DIAMOND_FIVE_ID,
  DIAMOND_SIX_ID,
  DIAMOND_SEVEN_ID,
  DIAMOND_EIGHT_ID,
  DIAMOND_NINE_ID,
  DIAMOND_TEN_ID,
  DIAMOND_JACK_ID,
  DIAMOND_QUEEN_ID,
  DIAMOND_KING_ID,
  // Club
  CLUB_ACE_ID,
  CLUB_TWO_ID,
  CLUB_THREE_ID,
  CLUB_FOUR_ID,
  CLUB_FIVE_ID,
  CLUB_SIX_ID,
  CLUB_SEVEN_ID,
  CLUB_EIGHT_ID,
  CLUB_NINE_ID,
  CLUB_TEN_ID,
  CLUB_JACK_ID,
  CLUB_QUEEN_ID,
  CLUB_KING_ID,
];
