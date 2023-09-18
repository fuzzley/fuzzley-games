import {Card} from './card';

/** A playing card that tracks it's suite, type, and other state properties. */
export class PlayingCard implements Card { /** @override */
    public faceUp : boolean;
    public suite : Suit;
    public type : Type;
}

/** Describes the standard suits that a playing card can have. */
export enum Suit {
    SPADE,
    HEART,
    DIAMOND,
    CLUB
}

/** Describes the standard types that a playing card can have. */
export enum Type {
    ACE,
    TWO,
    THREE,
    FOUR,
    FIVE,
    SIX,
    SEVEN,
    EIGHT,
    NINE,
    TEN,
    JACK,
    QUEEN,
    KING
}

export interface PlayingCardId {
    suit: Suit;
    type: Type;
}

// Spades
export const SPADE_ACE_ID: PlayingCardId = {
    suit: Suit.SPADE,
    type: Type.ACE,
};
export const SPADE_TWO_ID: PlayingCardId = {
    suit: Suit.SPADE,
    type: Type.TWO,
};
export const SPADE_THREE_ID: PlayingCardId = {
    suit: Suit.SPADE,
    type: Type.THREE,
};
export const SPADE_FOUR_ID: PlayingCardId = {
    suit: Suit.SPADE,
    type: Type.FOUR,
};
export const SPADE_FIVE_ID: PlayingCardId = {
    suit: Suit.SPADE,
    type: Type.FIVE,
};
export const SPADE_SIX_ID: PlayingCardId = {
    suit: Suit.SPADE,
    type: Type.SIX,
};
export const SPADE_SEVEN_ID: PlayingCardId = {
    suit: Suit.SPADE,
    type: Type.SEVEN,
};
export const SPADE_EIGHT_ID: PlayingCardId = {
    suit: Suit.SPADE,
    type: Type.EIGHT,
};
export const SPADE_NINE_ID: PlayingCardId = {
    suit: Suit.SPADE,
    type: Type.NINE,
};
export const SPADE_TEN_ID: PlayingCardId = {
    suit: Suit.SPADE,
    type: Type.TEN,
};
export const SPADE_JACK_ID: PlayingCardId = {
    suit: Suit.SPADE,
    type: Type.JACK,
};
export const SPADE_QUEEN_ID: PlayingCardId = {
    suit: Suit.SPADE,
    type: Type.QUEEN,
};
export const SPADE_KING_ID: PlayingCardId = {
    suit: Suit.SPADE,
    type: Type.KING,
};

// Hearts
export const HEART_ACE_ID: PlayingCardId = {
    suit: Suit.HEART,
    type: Type.ACE,
};
export const HEART_TWO_ID: PlayingCardId = {
    suit: Suit.HEART,
    type: Type.TWO,
};
export const HEART_THREE_ID: PlayingCardId = {
    suit: Suit.HEART,
    type: Type.THREE,
};
export const HEART_FOUR_ID: PlayingCardId = {
    suit: Suit.HEART,
    type: Type.FOUR,
};
export const HEART_FIVE_ID: PlayingCardId = {
    suit: Suit.HEART,
    type: Type.FIVE,
};
export const HEART_SIX_ID: PlayingCardId = {
    suit: Suit.HEART,
    type: Type.SIX,
};
export const HEART_SEVEN_ID: PlayingCardId = {
    suit: Suit.HEART,
    type: Type.SEVEN,
};
export const HEART_EIGHT_ID: PlayingCardId = {
    suit: Suit.HEART,
    type: Type.EIGHT,
};
export const HEART_NINE_ID: PlayingCardId = {
    suit: Suit.HEART,
    type: Type.NINE,
};
export const HEART_TEN_ID: PlayingCardId = {
    suit: Suit.HEART,
    type: Type.TEN,
};
export const HEART_JACK_ID: PlayingCardId = {
    suit: Suit.HEART,
    type: Type.JACK,
};
export const HEART_QUEEN_ID: PlayingCardId = {
    suit: Suit.HEART,
    type: Type.QUEEN,
};
export const HEART_KING_ID: PlayingCardId = {
    suit: Suit.HEART,
    type: Type.KING,
};

// Diamonds
export const DIAMOND_ACE_ID: PlayingCardId = {
    suit: Suit.DIAMOND,
    type: Type.ACE,
};
export const DIAMOND_TWO_ID: PlayingCardId = {
    suit: Suit.DIAMOND,
    type: Type.TWO,
};
export const DIAMOND_THREE_ID: PlayingCardId = {
    suit: Suit.DIAMOND,
    type: Type.THREE,
};
export const DIAMOND_FOUR_ID: PlayingCardId = {
    suit: Suit.DIAMOND,
    type: Type.FOUR,
};
export const DIAMOND_FIVE_ID: PlayingCardId = {
    suit: Suit.DIAMOND,
    type: Type.FIVE,
};
export const DIAMOND_SIX_ID: PlayingCardId = {
    suit: Suit.DIAMOND,
    type: Type.SIX,
};
export const DIAMOND_SEVEN_ID: PlayingCardId = {
    suit: Suit.DIAMOND,
    type: Type.SEVEN,
};
export const DIAMOND_EIGHT_ID: PlayingCardId = {
    suit: Suit.DIAMOND,
    type: Type.EIGHT,
};
export const DIAMOND_NINE_ID: PlayingCardId = {
    suit: Suit.DIAMOND,
    type: Type.NINE,
};
export const DIAMOND_TEN_ID: PlayingCardId = {
    suit: Suit.DIAMOND,
    type: Type.TEN,
};
export const DIAMOND_JACK_ID: PlayingCardId = {
    suit: Suit.DIAMOND,
    type: Type.JACK,
};
export const DIAMOND_QUEEN_ID: PlayingCardId = {
    suit: Suit.DIAMOND,
    type: Type.QUEEN,
};
export const DIAMOND_KING_ID: PlayingCardId = {
    suit: Suit.DIAMOND,
    type: Type.KING,
};

// Clubs
export const CLUB_ACE_ID: PlayingCardId = {
    suit: Suit.CLUB,
    type: Type.ACE,
};
export const CLUB_TWO_ID: PlayingCardId = {
    suit: Suit.CLUB,
    type: Type.TWO,
};
export const CLUB_THREE_ID: PlayingCardId = {
    suit: Suit.CLUB,
    type: Type.THREE,
};
export const CLUB_FOUR_ID: PlayingCardId = {
    suit: Suit.CLUB,
    type: Type.FOUR,
};
export const CLUB_FIVE_ID: PlayingCardId = {
    suit: Suit.CLUB,
    type: Type.FIVE,
};
export const CLUB_SIX_ID: PlayingCardId = {
    suit: Suit.CLUB,
    type: Type.SIX,
};
export const CLUB_SEVEN_ID: PlayingCardId = {
    suit: Suit.CLUB,
    type: Type.SEVEN,
};
export const CLUB_EIGHT_ID: PlayingCardId = {
    suit: Suit.CLUB,
    type: Type.EIGHT,
};
export const CLUB_NINE_ID: PlayingCardId = {
    suit: Suit.CLUB,
    type: Type.NINE,
};
export const CLUB_TEN_ID: PlayingCardId = {
    suit: Suit.CLUB,
    type: Type.TEN,
};
export const CLUB_JACK_ID: PlayingCardId = {
    suit: Suit.CLUB,
    type: Type.JACK,
};
export const CLUB_QUEEN_ID: PlayingCardId = {
    suit: Suit.CLUB,
    type: Type.QUEEN,
};
export const CLUB_KING_ID: PlayingCardId = {
    suit: Suit.CLUB,
    type: Type.KING,
};

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
